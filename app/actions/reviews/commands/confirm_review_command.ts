import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import ReviewSession from '#models/review_session'
import User from '#models/user'
import type { ConfirmReviewDTO } from '#actions/reviews/dtos/review_dtos'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import ConflictException from '#exceptions/conflict_exception'
import type { ReviewConfirmationEntry } from '#types/database'
import { adjustCredibility } from '#domain/reviews/review_formulas'

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
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: ConfirmReviewDTO): Promise<ReviewConfirmationEntry> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Get review session
      const session = await ReviewSession.query({ client: trx })
        .where('id', dto.review_session_id)
        .where('reviewee_id', userId)
        .where('status', 'completed')
        .preload('skill_reviews')
        .firstOrFail()

      // v3: Check if already confirmed in JSONB confirmations array
      const confirmations: ReviewConfirmationEntry[] = session.confirmations ?? []
      const existing = confirmations.find((c) => c.user_id === String(userId))

      if (existing) {
        throw new ConflictException('You have already confirmed or disputed this review')
      }

      // v3: Append to confirmations JSONB array
      const newConfirmation: ReviewConfirmationEntry = {
        user_id: String(userId),
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

      await session.useTransaction(trx).save()

      // v3: Update reviewer credibility_data JSONB on User
      const reviewerIds = [...new Set(session.skill_reviews.map((r) => r.reviewer_id))]
      for (const reviewerId of reviewerIds) {
        const reviewer = await User.query({ client: trx }).where('id', reviewerId).firstOrFail()

        const credData = reviewer.credibility_data ?? {
          credibility_score: 50,
          total_reviews_given: 0,
          accurate_reviews: 0,
          disputed_reviews: 0,
          last_calculated_at: null,
        }

        credData.total_reviews_given = (credData.total_reviews_given ?? 0) + 1

        if (dto.action === 'confirmed') {
          credData.accurate_reviews = (credData.accurate_reviews ?? 0) + 1
        } else {
          credData.disputed_reviews = (credData.disputed_reviews ?? 0) + 1
        }

        // DECIDE (pure)
        credData.credibility_score = adjustCredibility(credData.credibility_score ?? 50, dto.action)

        credData.last_calculated_at = DateTime.now().toISO()!
        reviewer.credibility_data = credData
        await reviewer.useTransaction(trx).save()
      }

      // Log audit
      await this.logAudit('confirm_review', 'review_session', session.id, null, {
        review_session_id: dto.review_session_id,
        action: dto.action,
        dispute_reason: dto.dispute_reason,
      })

      // Invalidate cache
      await CacheService.deleteByPattern(`review:session:${String(dto.review_session_id)}`)

      // Emit domain events for each reviewer
      for (const reviewerId of reviewerIds) {
        void emitter.emit('review:confirmed', {
          confirmationId: newConfirmation.user_id,
          reviewSessionId: dto.review_session_id,
          reviewerId,
          confirmedBy: userId,
        })
      }

      return newConfirmation
    })
  }
}
