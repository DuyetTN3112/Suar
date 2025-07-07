import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import SkillReviewRepository from '#infra/reviews/repositories/skill_review_repository'
import type { ConfirmReviewDTO } from '#actions/reviews/dtos/request/review_dtos'
import CacheService from '#infra/cache/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import ConflictException from '#exceptions/conflict_exception'
import type { ReviewConfirmationEntry } from '#types/database'

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

      // v3: Check if already confirmed in JSONB confirmations array
      const confirmations: ReviewConfirmationEntry[] = session.confirmations ?? []
      const existing = confirmations.find((c) => c.user_id === userId)

      if (existing) {
        throw new ConflictException('You have already confirmed or disputed this review')
      }

      // v3: Append to confirmations JSONB array
      const newConfirmation: ReviewConfirmationEntry = {
        user_id: userId,
        action: dto.action,
        dispute_reason: dto.dispute_reason ?? null,
        created_at: DateTime.now().toISO(),
      }
      confirmations.push(newConfirmation)
      session.confirmations = confirmations

      // Update session status if disputed
      if (dto.action === 'disputed') {
        session.status = 'disputed'
      }

      await ReviewSessionRepository.save(session, trx)

      const skillReviews = await SkillReviewRepository.listBySession(session.id, trx)
      const reviewerIds = [...new Set(skillReviews.map((review) => review.reviewer_id))]

      // Log audit
      await this.logAudit('confirm_review', 'review_session', session.id, null, {
        review_session_id: dto.review_session_id,
        action: dto.action,
        dispute_reason: dto.dispute_reason,
      })

      return {
        confirmation: newConfirmation,
        cachePattern: `review:session:${dto.review_session_id}`,
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

    await CacheService.deleteByPattern(result.cachePattern)
    await emitter.emit('review:confirmed', result.reviewConfirmedEvent)

    return result.confirmation
  }
}
