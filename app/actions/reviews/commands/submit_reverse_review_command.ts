import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import ReviewSession from '#models/review_session'
import ReverseReview from '#models/reverse_review'
import type { SubmitReverseReviewDTO } from '#actions/reviews/dtos/request/review_dtos'
import { ReviewSessionStatus } from '#constants/review_constants'
import { REVIEW_DEFAULTS } from '#constants/review_constants'
import ConflictException from '#exceptions/conflict_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CacheService from '#services/cache_service'

/**
 * SubmitReverseReviewCommand
 *
 * Allows a reviewee to rate their reviewers (360° feedback).
 * Can only be submitted after the review session is completed.
 */
export default class SubmitReverseReviewCommand extends BaseCommand<
  SubmitReverseReviewDTO,
  ReverseReview
> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: SubmitReverseReviewDTO): Promise<ReverseReview> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Validate rating range
      if (dto.rating < REVIEW_DEFAULTS.MIN_RATING || dto.rating > REVIEW_DEFAULTS.MAX_RATING) {
        throw new BusinessLogicException(
          `Rating must be between ${REVIEW_DEFAULTS.MIN_RATING} and ${REVIEW_DEFAULTS.MAX_RATING}`
        )
      }

      // Get review session — must be completed
      const session = await ReviewSession.query({ client: trx })
        .where('id', dto.review_session_id)
        .firstOrFail()

      if (
        session.status !== ReviewSessionStatus.COMPLETED &&
        session.status !== ReviewSessionStatus.DISPUTED
      ) {
        throw new BusinessLogicException(
          'Reverse review can only be submitted for completed or disputed sessions'
        )
      }

      // Only the reviewee can submit reverse reviews
      if (String(session.reviewee_id) !== String(userId)) {
        throw new BusinessLogicException('Only the reviewee can submit reverse reviews')
      }

      // Check for duplicate reverse review
      const existing = await ReverseReview.query({ client: trx })
        .where('review_session_id', dto.review_session_id)
        .where('reviewer_id', String(userId))
        .where('target_type', dto.target_type)
        .where('target_id', dto.target_id)
        .first()

      if (existing) {
        throw new ConflictException('You have already submitted a reverse review for this target')
      }

      // Create reverse review
      const reverseReview = await ReverseReview.create(
        {
          review_session_id: String(dto.review_session_id),
          reviewer_id: String(userId),
          target_type: dto.target_type,
          target_id: String(dto.target_id),
          rating: dto.rating,
          comment: dto.comment,
          is_anonymous: dto.is_anonymous,
        },
        { client: trx }
      )

      // Audit log
      await this.logAudit('submit_reverse_review', 'reverse_review', reverseReview.id, null, {
        review_session_id: dto.review_session_id,
        target_type: dto.target_type,
        target_id: dto.target_id,
        rating: dto.rating,
        is_anonymous: dto.is_anonymous,
      })

      // Invalidate cache
      await CacheService.deleteByPattern(`review:session:${String(dto.review_session_id)}`)

      return reverseReview
    })
  }
}
