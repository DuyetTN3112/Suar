import { DateTime } from 'luxon'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { SubmitSkillReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewCachePort } from '#modules/reviews/actions/ports/outbound/review_cache_port'
import type { ReviewSkillReader } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type {
  ReviewSubmissionPersistenceSession,
  ReviewSubmissionSessionSnapshot,
  ReviewSubmissionUnitOfWork,
  ReviewSubmittedEventStage,
} from '#modules/reviews/actions/ports/outbound/review_submission_unit_of_work'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  determineSessionStatus,
  isReviewSessionQuorumSatisfied,
} from '#modules/reviews/domain/review-core/review_formulas'
import { canSubmitReview } from '#modules/reviews/domain/review-core/review_policy'
import type { SkillReviewRecord } from '#modules/reviews/types/review_records'
import {
  getCanonicalProficiencyLevelValue,
  isCanonicalProficiencyLevelCode,
} from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException('User must be authenticated to execute this command')
  }
  return ctx.userId
}

interface ReviewSubmissionResult {
  skillReviews: SkillReviewRecord[]
  reviewSubmittedEvent: ReviewSubmittedEventStage
}

/**
 * Submits skill reviews for a review session.
 *
 * This command owns submission policy, validation, use-case sequencing,
 * quorum/status decisions, the domain-event payload, and post-commit effects.
 */
export default class SubmitSkillReviewCommand extends BaseCommand<
  SubmitSkillReviewDTO,
  SkillReviewRecord[]
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly skillReader: ReviewSkillReader,
    private readonly unitOfWork: ReviewSubmissionUnitOfWork,
    private readonly reviewCache: ReviewCachePort
  ) {
    super(execCtx)
  }

  async handle(dto: SubmitSkillReviewDTO): Promise<SkillReviewRecord[]> {
    const userId = requireUserId(this.execCtx)
    const result = await this.unitOfWork.run(async (persistence) => {
      const session = await this.loadReviewSession(persistence, dto.review_session_id)
      const access = await persistence.loadActorAccess(dto.review_session_id, userId)

      enforcePolicy(
        canSubmitReview({
          actorId: userId,
          sessionRevieweeId: access?.sessionRevieweeId ?? session.revieweeId,
          managerReviewerIds: access?.managerReviewerIds ?? [],
          peerReviewerIds: access?.peerReviewerIds ?? [],
          isOrgAdminOrOwner: access?.isOrgAdminOrOwner ?? false,
          reviewerType: dto.reviewer_type,
        })
      )

      const submissionTime = DateTime.now().toUTC().toJSDate()
      const assignment = await persistence.markReviewerAssignmentSubmitted({
        reviewSessionId: dto.review_session_id,
        reviewerId: userId,
        reviewerType: dto.reviewer_type,
        submittedAt: submissionTime,
      })
      await this.ensureReviewHasNotBeenSubmitted(persistence, dto.review_session_id, userId)
      await this.validateForeignKeys(dto.skill_ratings, persistence.transaction)
      await this.validateEvidenceOwnership(persistence, dto.review_session_id, dto.skill_ratings)

      const skillReviewRows = await Promise.all(
        dto.skill_ratings.map(async (rating) => {
          const proficiencyLevelId = await this.skillReader.resolveProficiencyLevelId(
            rating.assigned_public_proficiency_code,
            persistence.transaction
          )

          return {
            reviewSessionId: dto.review_session_id,
            reviewerId: userId,
            reviewerType: dto.reviewer_type,
            skillId: rating.skill_id,
            assignedPublicProficiencyCode: getCanonicalProficiencyLevelValue(
              rating.assigned_public_proficiency_code
            ),
            proficiencyLevelId,
            observedLevelId: rating.insufficient_evidence
              ? null
              : (rating.observed_level_id ?? proficiencyLevelId),
            rubricVersionId: rating.rubric_version_id ?? null,
            confidence: rating.confidence ?? null,
            rationale: rating.rationale ?? null,
            observableBehaviors: rating.observable_behaviors ?? [],
            reviewStatus: 'submitted' as const,
            submittedAt: submissionTime,
            comment: rating.comment ?? null,
          }
        })
      )

      const skillReviews = await persistence.createSkillReviews(skillReviewRows)
      await this.linkEvidenceToSkillReviews(persistence, skillReviews, dto)
      this.applySubmissionToSession(session, dto, userId)
      await persistence.saveSessionState({
        reviewSessionId: session.id,
        status: session.status,
        managerReviewCompleted: session.managerReviewCompleted,
        creatorReviewCompleted: session.creatorReviewCompleted,
        managerReviewsCount: session.managerReviewsCount,
        peerReviewsCount: session.peerReviewsCount,
        overallQualityScore: session.overallQualityScore,
        deliveryTimeliness: session.deliveryTimeliness,
        requirementAdherence: session.requirementAdherence,
        communicationQuality: session.communicationQuality,
        codeQualityScore: session.codeQualityScore,
        proactivenessScore: session.proactivenessScore,
        wouldWorkWithAgain: session.wouldWorkWithAgain,
        strengthsObserved: session.strengthsObserved,
        areasForImprovement: session.areasForImprovement,
        completedAt: session.completedAt,
      })

      const taskId = await persistence.loadTaskIdForAssignment(session.taskAssignmentId)
      if (!taskId) {
        throw new NotFoundException('Task assignment not found for review session')
      }

      await persistence.writeAudit(this.execCtx, {
        userId,
        reviewSessionId: session.id,
        reviewerType: dto.reviewer_type,
        skillsReviewed: dto.skill_ratings.length,
      })

      const submissionResult = this.buildSubmissionResult(
        dto,
        userId,
        session,
        skillReviews,
        taskId,
        assignment
      )
      await persistence.stageReviewSubmittedEvent(submissionResult.reviewSubmittedEvent)
      return submissionResult
    })

    await this.settleReviewPostCommitEffect(
      'review.cache.invalidated',
      async () => {
        await Promise.all([
          this.reviewCache.invalidateUserReviewData(result.reviewSubmittedEvent.revieweeId),
          this.reviewCache.invalidatePendingReviews(result.reviewSubmittedEvent.reviewerId),
          this.reviewCache.invalidateReview(result.reviewSubmittedEvent.reviewSessionId),
        ])
      },
      {
        disputeId: dto.review_session_id,
        actorId: result.reviewSubmittedEvent.reviewerId,
      }
    )
    return result.skillReviews
  }

  private async settleReviewPostCommitEffect(
    effectName: string,
    effect: () => Promise<void>,
    context: { disputeId: string; actorId: string }
  ): Promise<void> {
    try {
      await effect()
    } catch (error) {
      try {
        loggerService.error('Review post-commit effect failed', {
          effectName,
          committed: true,
          disputeId: context.disputeId,
          actorId: context.actorId,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        })
      } catch {
        // Telemetry failure must never alter the committed command result.
      }
    }
  }

  private async loadReviewSession(
    persistence: ReviewSubmissionPersistenceSession,
    reviewSessionId: string
  ): Promise<ReviewSubmissionSessionSnapshot> {
    const session = await persistence.loadSessionForUpdate(reviewSessionId)
    if (!session) {
      throw new NotFoundException('Review session không tồn tại')
    }
    if (session.status !== 'pending' && session.status !== 'in_progress') {
      throw new ConflictException('Review session is not accepting submissions')
    }
    return session
  }

  private async ensureReviewHasNotBeenSubmitted(
    persistence: ReviewSubmissionPersistenceSession,
    reviewSessionId: string,
    reviewerId: string
  ): Promise<void> {
    if (await persistence.hasSubmittedReview(reviewSessionId, reviewerId)) {
      throw new ConflictException('You have already submitted a review for this session')
    }
  }

  private applySubmissionToSession(
    session: ReviewSubmissionSessionSnapshot,
    dto: SubmitSkillReviewDTO,
    userId: string
  ): void {
    if (dto.reviewer_type === 'manager') {
      const qualityMetrics = dto.quality_metrics
      session.managerReviewCompleted = true
      session.managerReviewsCount += 1
      session.overallQualityScore = qualityMetrics.overall_quality_score
      session.deliveryTimeliness = qualityMetrics.delivery_timeliness
      session.requirementAdherence = qualityMetrics.requirement_adherence
      session.communicationQuality = qualityMetrics.communication_quality
      session.codeQualityScore = qualityMetrics.code_quality_score
      session.proactivenessScore = qualityMetrics.proactiveness_score
      session.wouldWorkWithAgain = qualityMetrics.would_work_with_again
      session.strengthsObserved = dto.strengths_observed
      session.areasForImprovement = dto.areas_for_improvement
    } else {
      session.peerReviewsCount += 1
    }

    if (session.creatorReviewerId === userId) {
      session.creatorReviewCompleted = true
    }

    const quorumSatisfied = isReviewSessionQuorumSatisfied({
      creatorReviewCompleted: session.creatorReviewCompleted,
      managerReviewsCount: session.managerReviewsCount,
      peerReviewsCount: session.peerReviewsCount,
      requiredTotalReviews: session.requiredTotalReviews,
      minimumManagerReviews: session.minimumManagerReviews,
      minimumPeerReviews: session.minimumPeerReviews,
    })
    const newStatus = determineSessionStatus(
      session.managerReviewCompleted,
      session.peerReviewsCount,
      session.requiredPeerReviews,
      session.status
    )
    session.status = quorumSatisfied ? 'completed' : newStatus
    if (session.status === 'completed') {
      session.completedAt = new Date()
    }
  }

  private buildSubmissionResult(
    dto: SubmitSkillReviewDTO,
    reviewerId: string,
    session: ReviewSubmissionSessionSnapshot,
    skillReviews: SkillReviewRecord[],
    taskId: string,
    assignment: { id: string; submittedAt: string }
  ): ReviewSubmissionResult {
    return {
      skillReviews,
      reviewSubmittedEvent: {
        submissionId: assignment.id,
        reviewSessionId: dto.review_session_id,
        reviewerAssignmentId: assignment.id,
        reviewerId,
        reviewerType: dto.reviewer_type,
        revieweeId: session.revieweeId,
        taskId,
        skillReviewIds: skillReviews.map((review) => review.id).sort(),
        submittedAt: assignment.submittedAt,
      },
    }
  }

  private async linkEvidenceToSkillReviews(
    persistence: ReviewSubmissionPersistenceSession,
    skillReviews: SkillReviewRecord[],
    dto: SubmitSkillReviewDTO
  ): Promise<void> {
    const rows = skillReviews.flatMap((review, index) => {
      const rating = dto.skill_ratings[index]
      return (rating?.evidence_ids ?? []).map((evidenceId) => ({
        skillReviewId: review.id,
        reviewEvidenceId: evidenceId,
        relevanceType: 'direct_observation' as const,
        reviewerNote: rating?.rationale ?? rating?.comment ?? null,
      }))
    })
    await persistence.linkEvidence(rows)
  }

  private async validateEvidenceOwnership(
    persistence: ReviewSubmissionPersistenceSession,
    reviewSessionId: string,
    ratings: SubmitSkillReviewDTO['skill_ratings']
  ): Promise<void> {
    const requestedEvidenceIds = [
      ...new Set(
        ratings.flatMap((rating) =>
          (rating.evidence_ids ?? []).map((evidenceId) => evidenceId.toLowerCase())
        )
      ),
    ]
    if (requestedEvidenceIds.length === 0) {
      return
    }

    const ownedEvidence = await persistence.listOwnedEvidenceIds(
      reviewSessionId,
      requestedEvidenceIds
    )
    const ownedEvidenceIds = new Set(ownedEvidence.map((id) => id.toLowerCase()))
    if (requestedEvidenceIds.some((evidenceId) => !ownedEvidenceIds.has(evidenceId))) {
      throw new ValidationException(
        'evidence_ids must reference evidence from the submitted review session'
      )
    }
  }

  private async validateForeignKeys(
    ratings: { skill_id: string; assigned_public_proficiency_code: string }[],
    transaction: ReviewTransaction
  ): Promise<void> {
    const skills = await this.skillReader.findSkillsByIds(
      ratings.map((rating) => rating.skill_id),
      transaction
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
      if (!isCanonicalProficiencyLevelCode(rating.assigned_public_proficiency_code)) {
        throw new BusinessLogicException(
          `Proficiency level không hợp lệ: ${rating.assigned_public_proficiency_code}`
        )
      }
    }
  }
}
