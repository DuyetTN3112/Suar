import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { SubmitSkillReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import { ReviewSessionStatus } from '#modules/reviews/constants/review_constants'
import { determineSessionStatus } from '#modules/reviews/domain/review_formulas'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { SkillReviewRecord } from '#modules/reviews/types/review_records'
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

      await this.ensureReviewHasNotBeenSubmitted(dto.review_session_id, userId, trx)
      await this.validateForeignKeys(dto.skill_ratings, trx)

      const skillReviews = await SkillReviewRepository.createMany(
        this.buildSkillReviewRows(dto, userId),
        trx
      )

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

  private buildSkillReviewRows(
    dto: SubmitSkillReviewDTO,
    reviewerId: string
  ): {
    review_session_id: string
    reviewer_id: string
    reviewer_type: 'manager' | 'peer'
    skill_id: string
    assigned_level_code: string
    comment: string | null
  }[] {
    return dto.skill_ratings.map((rating) => ({
      review_session_id: dto.review_session_id,
      reviewer_id: reviewerId,
      reviewer_type: dto.reviewer_type,
      skill_id: rating.skill_id,
      assigned_level_code: rating.assigned_level_code,
      comment: rating.comment ?? null,
    }))
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
