import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import ReviewSession from '#models/review_session'
import ReviewConfirmation from '#models/review_confirmation'
import ReviewerCredibility from '#models/reviewer_credibility'
import type { ConfirmReviewDTO } from '#actions/reviews/dtos/review_dtos'
import CacheService from '#services/cache_service'
import ConflictException from '#exceptions/conflict_exception'

/**
 * ConfirmReviewCommand
 *
 * Reviewee confirms or disputes the review results.
 * Updates reviewer credibility scores based on confirmation.
 */
export default class ConfirmReviewCommand extends BaseCommand<
  ConfirmReviewDTO,
  ReviewConfirmation
> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: ConfirmReviewDTO): Promise<ReviewConfirmation> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUser().id

      // Get review session
      const session = await ReviewSession.query({ client: trx })
        .where('id', dto.review_session_id)
        .where('reviewee_id', userId)
        .where('status', 'completed')
        .preload('skill_reviews')
        .firstOrFail()

      // Check if already confirmed
      const existing = await ReviewConfirmation.query({ client: trx })
        .where('review_session_id', dto.review_session_id)
        .where('user_id', userId)
        .first()

      if (existing) {
        throw new ConflictException('You have already confirmed or disputed this review')
      }

      // Create confirmation
      const confirmation = await ReviewConfirmation.create(
        {
          review_session_id: String(dto.review_session_id),
          user_id: String(userId),
          action: dto.action,
          dispute_reason: dto.dispute_reason,
        },
        { client: trx }
      )

      // Update session status if disputed
      if (dto.action === 'disputed') {
        session.status = 'disputed'
        await session.useTransaction(trx).save()
      }

      // Update reviewer credibility scores
      const reviewerIds = [...new Set(session.skill_reviews.map((r) => r.reviewer_id))]
      for (const reviewerId of reviewerIds) {
        let credibility = await ReviewerCredibility.query({ client: trx })
          .where('user_id', reviewerId)
          .first()

        if (!credibility) {
          credibility = await ReviewerCredibility.create(
            {
              user_id: reviewerId,
              credibility_score: 50,
              total_reviews_given: 0,
              accurate_reviews: 0,
              disputed_reviews: 0,
            },
            { client: trx }
          )
        }

        credibility.total_reviews_given += 1

        if (dto.action === 'confirmed') {
          credibility.accurate_reviews += 1
          // Increase credibility (max 100)
          credibility.credibility_score = Math.min(100, credibility.credibility_score + 2)
        } else {
          credibility.disputed_reviews += 1
          // Decrease credibility (min 0)
          credibility.credibility_score = Math.max(0, credibility.credibility_score - 5)
        }

        credibility.last_calculated_at = DateTime.now()
        await credibility.useTransaction(trx).save()
      }

      // Log audit
      await this.logAudit('confirm_review', 'review_confirmation', confirmation.id, null, {
        review_session_id: dto.review_session_id,
        action: dto.action,
        dispute_reason: dto.dispute_reason,
      })

      // Invalidate cache
      await CacheService.deleteByPattern(`review:session:${String(dto.review_session_id)}`)

      return confirmation
    })
  }
}
