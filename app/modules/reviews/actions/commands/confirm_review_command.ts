import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ConfirmReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import { createReviewDisputeRecord } from '#modules/reviews/actions/support/review_dispute_creation'
import { isReviewSessionQuorumSatisfied } from '#modules/reviews/domain/review_formulas'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

/**
 * ConfirmReviewCommand
 *
 * Reviewee confirms or disputes the review results.
 * v3: Confirmation stored in review_sessions.confirmations JSONB array.
 * Credibility stored in users.credibility_data JSONB.
 */
export default class ConfirmReviewCommand extends BaseCommand<
  ConfirmReviewDTO,
  ReviewConfirmationEntry
> {
  async handle(dto: ConfirmReviewDTO): Promise<ReviewConfirmationEntry> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Get review session
      const session = await ReviewSessionRepository.findCompletedForRevieweeForUpdate(
        dto.review_session_id,
        userId,
        trx
      )

      if (!session) {
        throw new ConflictException('Review session không tồn tại hoặc không thể xác nhận')
      }

      const quorumSatisfied = isReviewSessionQuorumSatisfied({
        creatorReviewCompleted: session.creator_review_completed,
        managerReviewsCount: session.manager_reviews_count,
        peerReviewsCount: session.peer_reviews_count,
        requiredTotalReviews: session.required_total_reviews,
        minimumManagerReviews: session.minimum_manager_reviews,
        minimumPeerReviews: session.minimum_peer_reviews,
      })

      if (!quorumSatisfied) {
        throw new ConflictException('Review session chưa đủ điều kiện quorum để xác nhận')
      }

      // v3: Check if already confirmed in JSONB confirmations array
      const confirmations: ReviewConfirmationEntry[] = session.confirmations ?? []
      const existing = confirmations.find((c) => c.user_id === userId)

      if (existing) {
        throw new ConflictException('You have already confirmed or disputed this review')
      }

      let newConfirmation: ReviewConfirmationEntry
      let taskId: string | null = null

      if (dto.action === 'disputed') {
        const { confirmation, assignment } = await createReviewDisputeRecord({
          trx,
          actorId: userId,
          reviewSessionId: session.id,
          disputeReason: dto.dispute_reason?.trim() ?? 'No reason provided',
          requestedOutcome: 'other',
        })

        if (!confirmation) {
          throw new ConflictException('Review dispute confirmation could not be created')
        }

        newConfirmation = confirmation
        taskId = assignment.task_id
      } else {
        newConfirmation = {
          user_id: userId,
          action: dto.action,
          dispute_reason: dto.dispute_reason ?? null,
          created_at: DateTime.now().toISO(),
        }
        confirmations.push(newConfirmation)
        session.confirmations = confirmations
        await ReviewSessionRepository.save(session, trx)
        const assignment = (await trx
          .from('task_assignments')
          .where('id', session.task_assignment_id)
          .select('task_id')
          .first()) as { task_id: string } | undefined
        taskId = assignment?.task_id ?? null
      }


      const skillReviews = await SkillReviewRepository.listBySession(session.id, trx)
      const reviewerIds = [...new Set(skillReviews.map((review) => review.reviewer_id))]

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'confirm_review',
          entity_type: 'review_session',
          entity_id: session.id,
          old_values: null,
          new_values: {
            review_session_id: dto.review_session_id,
            action: dto.action,
            dispute_reason: dto.dispute_reason,
          },
        })
      }

      return {
        confirmation: newConfirmation,
        cachePattern: `review:session:sessionId:${dto.review_session_id}`,
        taskDetailCachePattern: taskId ? `task:detail:${taskId}*` : null,
        reviewConfirmedEvent: {
          confirmationId: newConfirmation.user_id,
          reviewSessionId: dto.review_session_id,
          revieweeId: session.reviewee_id,
          reviewerIds,
          confirmedBy: userId,
          action: dto.action,
        },
      }
    })

    await cacheStore.deleteByPattern(result.cachePattern)
    if (result.taskDetailCachePattern) {
      await cacheStore.deleteByPattern(result.taskDetailCachePattern)
    }
    await emitter.emit('review:confirmed', result.reviewConfirmedEvent)

    return result.confirmation
  }
}
