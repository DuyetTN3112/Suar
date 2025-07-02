import { BaseCommand } from '#actions/shared/base_command'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import ReverseReviewRepository from '#infra/reviews/repositories/reverse_review_repository'
import type { SubmitReverseReviewDTO } from '#actions/reviews/dtos/request/review_dtos'
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
  import('#models/reverse_review').default
> {
  async handle(dto: SubmitReverseReviewDTO): Promise<import('#models/reverse_review').default> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Validate rating range
      if (dto.rating < REVIEW_DEFAULTS.MIN_RATING || dto.rating > REVIEW_DEFAULTS.MAX_RATING) {
        throw new BusinessLogicException(
          `Rating must be between ${REVIEW_DEFAULTS.MIN_RATING} and ${REVIEW_DEFAULTS.MAX_RATING}`
        )
      }

      // Get review session — must be completed
      const session = await ReviewSessionRepository.findById(dto.review_session_id, trx)
      if (!session) {
        throw new BusinessLogicException('Review session không tồn tại')
      }

      if (session.status !== 'completed' && session.status !== 'disputed') {
        throw new BusinessLogicException(
          'Reverse review can only be submitted for completed or disputed sessions'
        )
      }

      // Only the reviewee can submit reverse reviews
      if (session.reviewee_id !== userId) {
        throw new BusinessLogicException('Only the reviewee can submit reverse reviews')
      }

      // Check for duplicate reverse review
      const existing = await ReverseReviewRepository.findByUniqueScope(
        dto.review_session_id,
        userId,
        dto.target_type,
        dto.target_id,
        trx
      )

      if (existing) {
        throw new ConflictException('You have already submitted a reverse review for this target')
      }

      // Create reverse review
      const reverseReview = await ReverseReviewRepository.create(
        {
          review_session_id: dto.review_session_id,
          reviewer_id: userId,
          target_type: dto.target_type,
          target_id: dto.target_id,
          rating: dto.rating,
          comment: dto.comment,
          is_anonymous: dto.is_anonymous,
        },
        trx
      )

      // Audit log
      await this.logAudit('submit_reverse_review', 'reverse_review', reverseReview.id, null, {
        review_session_id: dto.review_session_id,
        target_type: dto.target_type,
        target_id: dto.target_id,
        rating: dto.rating,
        is_anonymous: dto.is_anonymous,
      })

      return {
        reverseReview,
        cachePattern: `review:session:${dto.review_session_id}`,
      }
    })

    await CacheService.deleteByPattern(result.cachePattern)
    return result.reverseReview
  }
}
