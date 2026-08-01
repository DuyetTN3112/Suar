import { DateTime } from 'luxon'

import { reviewSessionCacheKey } from '#modules/cache/public_contracts/cache_contract'
import { cacheInvalidationStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type { ConfirmReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewConfirmationDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_confirmation_dispute_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  canOpenReviewDispute,
  isActiveReviewDisputeStatus,
} from '#modules/reviews/domain/review_dispute_rules'
import { isReviewSessionQuorumSatisfied } from '#modules/reviews/domain/review_formulas'
import {
  ReviewDisputeStatus,
  ReviewSessionStatus,
} from '#modules/reviews/public_contracts/review_constants'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }
  return ctx.userId
}

function daysSinceCompleted(value: Date | string | null): number | null {
  if (!value) return null
  const completedAt = value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromISO(value)
  return Math.floor(DateTime.now().diff(completedAt, 'days').days)
}

function enforceDisputeOpeningPolicy(input: {
  actorId: string
  revieweeId: string
  reviewSessionStatus: string
  disputeStatuses: string[]
  disputeReason: string
  completedAt: Date | string | null
}): void {
  const policy = canOpenReviewDispute({
    actorId: input.actorId,
    revieweeId: input.revieweeId,
    reviewSessionStatus: input.reviewSessionStatus,
    hasActiveDispute: input.disputeStatuses.some(isActiveReviewDisputeStatus),
    disputeReason: input.disputeReason,
    daysSinceCompleted: daysSinceCompleted(input.completedAt),
  })
  if (!policy.allowed) {
    if (policy.code === 'FORBIDDEN') {
      throw new ForbiddenException(policy.reason)
    }
    throw new BusinessLogicException(policy.reason)
  }
}

/**
 * ConfirmReviewCommand
 *
 * Reviewee confirms or disputes the review results.
 * v3: Confirmation stored in review_sessions.confirmations JSONB array.
 * Credibility stored in users.credibility_data JSONB.
 */
export default class ConfirmReviewCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewConfirmationDisputeUnitOfWork
  ) {}

  async handle(dto: ConfirmReviewDTO): Promise<ReviewConfirmationEntry> {
    const userId = requireUserId(this.execCtx)
    const result = await this.unitOfWork.run(async (persistence) => {
      const session = await persistence.loadSessionForUpdate(dto.review_session_id)
      if (
        !session ||
        session.revieweeId !== userId ||
        session.status !== ReviewSessionStatus.COMPLETED
      ) {
        throw new ConflictException('Review session không tồn tại hoặc không thể xác nhận')
      }

      const quorumSatisfied = isReviewSessionQuorumSatisfied({
        creatorReviewCompleted: session.creatorReviewCompleted,
        managerReviewsCount: session.managerReviewsCount,
        peerReviewsCount: session.peerReviewsCount,
        requiredTotalReviews: session.requiredTotalReviews,
        minimumManagerReviews: session.minimumManagerReviews,
        minimumPeerReviews: session.minimumPeerReviews,
      })

      if (!quorumSatisfied) {
        throw new ConflictException('Review session chưa đủ điều kiện quorum để xác nhận')
      }

      // v3: Check if already confirmed in JSONB confirmations array
      const confirmations = [...session.confirmations]
      const existing = confirmations.find((c) => c.user_id === userId)

      if (existing) {
        throw new ConflictException('You have already confirmed or disputed this review')
      }

      let newConfirmation: ReviewConfirmationEntry

      if (dto.action === 'disputed') {
        const assignment = await persistence.loadAssignment(session.taskAssignmentId)
        if (!assignment) {
          throw new NotFoundException('Task assignment not found')
        }
        const disputeReason = dto.dispute_reason?.trim() ?? 'No reason provided'
        const disputeStatuses = await persistence.listDisputeStatuses(session.id)
        enforceDisputeOpeningPolicy({
          actorId: userId,
          revieweeId: session.revieweeId,
          reviewSessionStatus: session.status,
          disputeStatuses,
          disputeReason,
          completedAt: session.completedAt,
        })
        await persistence.createDispute({
          reviewSessionId: session.id,
          taskAssignmentId: assignment.id,
          taskId: assignment.taskId,
          revieweeId: session.revieweeId,
          openedBy: userId,
          status: ReviewDisputeStatus.PENDING,
          disputeReason,
          disputedDimensions: null,
          disputedSkillReviews: null,
          requestedOutcome: 'other',
        })
        newConfirmation = {
          user_id: userId,
          action: 'disputed',
          dispute_reason: disputeReason,
          created_at: DateTime.now().toISO(),
        }
        confirmations.push(newConfirmation)
        await persistence.saveSessionState({
          reviewSessionId: session.id,
          status: ReviewSessionStatus.DISPUTED,
          confirmations,
          updatedAt: new Date(),
        })
      } else {
        newConfirmation = {
          user_id: userId,
          action: dto.action,
          dispute_reason: dto.dispute_reason ?? null,
          created_at: DateTime.now().toISO(),
        }
        confirmations.push(newConfirmation)
        await persistence.saveSessionState({
          reviewSessionId: session.id,
          status: session.status,
          confirmations,
          updatedAt: new Date(),
        })
        await persistence.verifyLinkedEvidence(session.id)
      }

      const reviewerIds = [...new Set(await persistence.listReviewerIds(session.id, false))].sort()

      await persistence.writeAudit(this.execCtx, {
        userId,
        action: 'confirm_review',
        entityType: 'review_session',
        entityId: session.id,
        newValues: {
          review_session_id: dto.review_session_id,
          action: dto.action,
          dispute_reason: dto.dispute_reason,
        },
      })

      const confirmationId = `review-confirmed:${session.id}:${userId}`
      await persistence.stageReviewConfirmedEvent({
        confirmationId,
        reviewSessionId: dto.review_session_id,
        revieweeId: session.revieweeId,
        reviewerIds,
        confirmedBy: userId,
        action: dto.action,
      })

      return {
        confirmation: newConfirmation,
        cachePattern: reviewSessionCacheKey(dto.review_session_id),
        confirmedBy: userId,
      }
    })

    await this.settlePostCommitEffect(
      'review.cache.invalidated',
      async () => {
        await cacheInvalidationStore.deleteByPattern(result.cachePattern)
      },
      {
        disputeId: dto.review_session_id,
        actorId: result.confirmedBy,
      }
    )

    return result.confirmation
  }

  private async settlePostCommitEffect(
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
}
