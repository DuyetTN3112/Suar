import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { GetReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'

/**
 * GetReviewSessionQuery
 *
 * Fetches a review session with all related data.
 */
export default class GetReviewSessionQuery extends BaseQuery<
  GetReviewSessionDTO,
  ReviewSessionRecord
> {
  async handle(dto: GetReviewSessionDTO): Promise<ReviewSessionRecord> {
    const cacheKey = this.generateCacheKey('review:session', {
      sessionId: dto.review_session_id,
    })

    return await this.executeWithCache(cacheKey, 300, async () => {
      return ReviewSessionRepository.findByIdWithRelations(dto.review_session_id)
    })
  }
}
