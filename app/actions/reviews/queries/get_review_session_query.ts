import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import ReviewSession from '#models/review_session'
import type { GetReviewSessionDTO } from '#actions/reviews/dtos/review_dtos'

/**
 * GetReviewSessionQuery
 *
 * Fetches a review session with all related data.
 */
export default class GetReviewSessionQuery extends BaseQuery<GetReviewSessionDTO, ReviewSession> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: GetReviewSessionDTO): Promise<ReviewSession> {
    const cacheKey = this.generateCacheKey('review:session', {
      sessionId: dto.review_session_id,
    })

    return await this.executeWithCache(cacheKey, 300, async () => {
      const session = await ReviewSession.query()
        .where('id', dto.review_session_id)
        .preload('reviewee')
        .preload('task_assignment', (assignmentQuery) => {
          void assignmentQuery.preload('task')
        })
        .preload('skill_reviews', (reviewQuery) => {
          void reviewQuery.preload('skill')
          void reviewQuery.preload(
            'reviewer',
            (userQuery) => void userQuery.select(['id', 'username', 'email'])
          )
        })
        .firstOrFail()

      return session
    })
  }
}
