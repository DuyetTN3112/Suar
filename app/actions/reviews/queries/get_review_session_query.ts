import { BaseQuery } from '#actions/reviews/base_query'
import type { GetReviewSessionDTO } from '#actions/reviews/dtos/request/review_dtos'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#types/review_records'

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
