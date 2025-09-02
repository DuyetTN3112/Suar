import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { SubmitSkillReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import { loadReviewSessionActorAccessContext } from '#modules/reviews/actions/support/review_session_actor_access'
import { ReviewSessionStatus } from '#modules/reviews/constants/review_constants'
import { determineSessionStatus } from '#modules/reviews/domain/review_formulas'
import { canSubmitReview } from '#modules/reviews/domain/review_policy'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { SkillReviewRecord } from '#modules/reviews/types/review_records'
import { skillPublicApi } from '#modules/skills/actions/services/skill_public_api'
import { ProficiencyLevel } from '#modules/users/public_contracts/user_constants'

/**
 * SubmitSkillReviewCommand
 *
 * Submits skill reviews for a review session.
 * Updates session status based on review completion.
 */
export default class SubmitSkillReviewCommand extends BaseCommand<
  SubmitSkillReviewDTO,
  SkillReviewRecord[]
> {
  async handle(dto: SubmitSkillReviewDTO): Promise<SkillReviewRecord[]> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()
      const session = await this.loadReviewSession(dto.review_session_id, trx)
      const access = await loadReviewSessionActorAccessContext(dto.review_session_id, userId, trx)

      enforcePolicy(
        canSubmitReview({
          actorId: userId,
          actorSystemRole: access?.actorSystemRole ?? null,
          sessionRevieweeId: access?.sessionRevieweeId ?? session.reviewee_id,
          sessionTaskOrgId: access?.sessionTaskOrgId ?? '',
          managerReviewerIds: access?.managerReviewerIds ?? [],
          peerReviewerIds: access?.peerReviewerIds ?? [],
          isOrgAdminOrOwner: access?.isOrgAdminOrOwner ?? false,
          reviewerType: dto.reviewer_type,
        })
      )

      await this.ensureReviewHasNotBeenSubmitted(dto.review_session_id, userId, trx)
      await this.validateForeignKeys(dto.skill_ratings, trx)

      const activeScale = await skillPublicApi.proficiencyScale.getActiveScaleWithLevels(trx)
      const levelMap: Record<string, string> = {}
      if (activeScale) {
        for (const lvl of activeScale.levels) {
          levelMap[lvl.code] = lvl.id
        }
      }

      const skillReviewRows = dto.skill_ratings.map((rating) => ({
        review_session_id: dto.review_session_id,
        reviewer_id: userId,
        reviewer_type: dto.reviewer_type,
        skill_id: rating.skill_id,
        assigned_level_code: rating.assigned_level_code,
        proficiency_level_id: levelMap[rating.assigned_level_code] ?? null,
        observed_level_id: rating.insufficient_evidence
          ? null
          : (rating.observed_level_id ?? levelMap[rating.assigned_level_code] ?? null),
        rubric_version_id: rating.rubric_version_id ?? null,
        confidence: rating.confidence ?? null,
        rationale: rating.rationale ?? null,
        observable_behaviors: rating.observable_behaviors ?? [],
        review_status: 'submitted' as const,
        submitted_at: DateTime.now(),
        comment: rating.comment ?? null,
      }))

      const skillReviews = await SkillReviewRepository.createMany(skillReviewRows, trx)
      await this.linkEvidenceToSkillReviews(skillReviews, dto, trx)

      this.applySubmissionToSession(session, dto)
      await ReviewSessionRepository.save(session, trx)

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'submit_review',
          entity_type: 'review_session',
          entity_id: session.id,
          old_values: null,
          new_values: {
            reviewer_id: userId,
            reviewer_type: dto.reviewer_type,
            skills_reviewed: dto.skill_ratings.length,
          },
        })
      }

      return this.buildSubmissionResult(dto, userId, session, skillReviews)
    })

    await cacheStore.deleteByPattern(result.revieweeCachePattern)
    await cacheStore.deleteByPattern(result.reviewSessionCachePattern)
    void emitter.emit('review:submitted', result.reviewSubmittedEvent)

    return result.skillReviews
  }

  private async loadReviewSession(reviewSessionId: string, trx: TransactionClientContract) {
    const session = await ReviewSessionRepository.findByIdWithAllowedStatuses(
      reviewSessionId,
      [ReviewSessionStatus.PENDING, ReviewSessionStatus.IN_PROGRESS],
      trx
    )

    if (!session) {
      throw new NotFoundException(
        'Review session không tồn tại hoặc không ở trạng thái có thể submit'
      )
    }

    return session
  }

  private async ensureReviewHasNotBeenSubmitted(
    reviewSessionId: string,
    reviewerId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    const existingReview = await SkillReviewRepository.findBySessionAndReviewer(
      reviewSessionId,
      reviewerId,
      trx
    )

    if (existingReview) {
      throw new ConflictException('You have already submitted a review for this session')
    }
  }
  private applySubmissionToSession(
    session: {
      manager_review_completed: boolean
      peer_reviews_count: number
      required_peer_reviews: number
      status: 'pending' | 'in_progress' | 'completed' | 'disputed'
      overall_quality_score: number | null
      delivery_timeliness: string | null
      requirement_adherence: number | null
      communication_quality: number | null
      code_quality_score: number | null
      proactiveness_score: number | null
      would_work_with_again: boolean | null
      strengths_observed: string | null
      areas_for_improvement: string | null
      completed_at: DateTime | null
    },
    dto: SubmitSkillReviewDTO
  ): void {
    if (dto.reviewer_type === 'manager') {
      const qualityMetrics = dto.quality_metrics
      session.manager_review_completed = true
      session.overall_quality_score = qualityMetrics.overall_quality_score
      session.delivery_timeliness = qualityMetrics.delivery_timeliness
      session.requirement_adherence = qualityMetrics.requirement_adherence
      session.communication_quality = qualityMetrics.communication_quality
      session.code_quality_score = qualityMetrics.code_quality_score
      session.proactiveness_score = qualityMetrics.proactiveness_score
      session.would_work_with_again = qualityMetrics.would_work_with_again
      session.strengths_observed = dto.strengths_observed
      session.areas_for_improvement = dto.areas_for_improvement
    } else {
      session.peer_reviews_count += 1
    }

    const newStatus = determineSessionStatus(
      session.manager_review_completed,
      session.peer_reviews_count,
      session.required_peer_reviews,
      session.status
    )
    session.status = newStatus

    if (newStatus === 'completed') {
      session.completed_at = DateTime.now()
    }
  }

  private buildSubmissionResult(
    dto: SubmitSkillReviewDTO,
    reviewerId: string,
    session: {
      reviewee_id: string
      task_assignment_id: string
      id: string
    },
    skillReviews: SkillReviewRecord[]
  ): {
    skillReviews: SkillReviewRecord[]
    revieweeCachePattern: string
    reviewSessionCachePattern: string
    reviewSubmittedEvent: {
      reviewSessionId: string
      reviewerId: string
      revieweeId: string
      taskId: string
      scores: Record<string, number>
    }
  } {
    return {
      skillReviews,
      revieweeCachePattern: `user:${session.reviewee_id}:*`,
      reviewSessionCachePattern: `review:session:${session.id}`,
      reviewSubmittedEvent: {
        reviewSessionId: dto.review_session_id,
        reviewerId,
        revieweeId: session.reviewee_id,
        taskId: session.task_assignment_id,
        scores: Object.fromEntries(skillReviews.map((review) => [review.skill_id, 0])),
      },
    }
  }

  private async linkEvidenceToSkillReviews(
    skillReviews: SkillReviewRecord[],
    dto: SubmitSkillReviewDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    const rows = skillReviews.flatMap((review, index) => {
      const rating = dto.skill_ratings[index]
      return (rating?.evidence_ids ?? []).map((evidenceId) => ({
        skill_review_id: review.id,
        review_evidence_id: evidenceId,
        relevance_type: 'direct_observation',
        reviewer_note: rating?.rationale ?? rating?.comment ?? null,
      }))
    })

    if (rows.length > 0) {
      await trx.table('skill_review_evidence_links').insert(rows)
    }
  }

  /**
   * Validate FK: skill_id -> skills.id and assigned_level_code -> ProficiencyLevel enum
   */
  private async validateForeignKeys(
    ratings: { skill_id: string; assigned_level_code: string }[],
    trx: TransactionClientContract
  ): Promise<void> {
    const skills = await DefaultReviewDependencies.skill.findSkillsByIds(
      ratings.map((rating) => rating.skill_id),
      trx
    )
    const skillMap = new Map(skills.map((skill) => [skill.id, skill]))

    for (const rating of ratings) {
      const skill = skillMap.get(rating.skill_id)
      if (!skill) {
        throw new NotFoundException(`Skill với ID ${rating.skill_id} không tồn tại`)
      }

      if (!skill.is_active) {
        throw new BusinessLogicException(`Skill với ID ${rating.skill_id} đã bị vô hiệu hóa`)
      }

      // Validate assigned_level_code is a valid ProficiencyLevel constant
      const validLevels = Object.values(ProficiencyLevel) as string[]
      if (!validLevels.includes(rating.assigned_level_code)) {
        throw new BusinessLogicException(
          `Proficiency level không hợp lệ: ${rating.assigned_level_code}`
        )
      }
    }
  }
}
