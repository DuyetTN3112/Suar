import type { ExecutionContext } from '#types/execution_context'
import { BaseQuery } from '#actions/shared/base_query'
import type ReviewSession from '#models/review_session'
import type { GetReviewSessionDTO } from '#actions/reviews/dtos/request/review_dtos'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'

/**
 * GetReviewSessionQuery
 *
 * Fetches a review session with all related data.
 */
export default class GetReviewSessionQuery extends BaseQuery<GetReviewSessionDTO, ReviewSession> {
  constructor(execCtx: ExecutionContext) {
    super(execCtx)
  }

  async handle(dto: GetReviewSessionDTO): Promise<ReviewSession> {
    const cacheKey = this.generateCacheKey('review:session', {
      sessionId: dto.review_session_id,
    })

    return await this.executeWithCache(cacheKey, 300, async () => {
      return ReviewSessionRepository.findByIdWithRelations(dto.review_session_id)
    })
  }
}
