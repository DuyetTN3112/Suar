import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/reviews/base_command'
import type { SubmitReverseReviewDTO } from '#actions/reviews/dtos/request/review_dtos'
import { REVIEW_DEFAULTS } from '#constants/review_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ConflictException from '#exceptions/conflict_exception'
import CacheService from '#infra/cache/cache_service'
import ReverseReviewRepository from '#infra/reviews/repositories/reverse_review_repository'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import type { ReverseReviewRecord } from '#types/review_records'

/**
 * SubmitReverseReviewCommand
 *
 * Allows a reviewee to rate their reviewers (360° feedback).
 * Can only be submitted after the review session is completed.
 */
export default class SubmitReverseReviewCommand extends BaseCommand<
  SubmitReverseReviewDTO,
  ReverseReviewRecord
> {
  async handle(dto: SubmitReverseReviewDTO): Promise<ReverseReviewRecord> {
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
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'submit_reverse_review',
          entity_type: 'reverse_review',
          entity_id: reverseReview.id,
          old_values: null,
          new_values: {
            review_session_id: dto.review_session_id,
            target_type: dto.target_type,
            target_id: dto.target_id,
            rating: dto.rating,
            is_anonymous: dto.is_anonymous,
          },
        })
      }

      return {
        reverseReview,
        cachePattern: `review:session:${dto.review_session_id}`,
      }
    })

    await CacheService.deleteByPattern(result.cachePattern)
    return result.reverseReview
  }
}
