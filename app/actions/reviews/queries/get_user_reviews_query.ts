import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import ReviewSession from '#models/review_session'
import type { GetUserReviewsDTO } from '#actions/reviews/dtos/review_dtos'

interface UserReviewsResult {
  data: ReviewSession[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

/**
 * GetUserReviewsQuery
 *
 * Fetches all review sessions for a user (as reviewee).
 */
export default class GetUserReviewsQuery extends BaseQuery<GetUserReviewsDTO, UserReviewsResult> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: GetUserReviewsDTO): Promise<UserReviewsResult> {
    const cacheKey = this.generateCacheKey('user:reviews', {
      userId: dto.user_id,
      page: dto.page,
    })

    return await this.executeWithCache(cacheKey, 120, async () => {
      const query = ReviewSession.query()
        .where('reviewee_id', dto.user_id)
        .whereIn('status', ['completed', 'disputed'])
        .preload('task_assignment', (assignmentQuery) => {
          assignmentQuery.preload('task', (taskQuery) => {
            taskQuery.select(['id', 'title'])
          })
        })
        .preload('skill_reviews', (reviewQuery) => {
          reviewQuery.preload('skill').preload('assigned_level')
        })
        .preload('confirmations')
        .orderBy('completed_at', 'desc')

      const result = await query.paginate(dto.page, dto.per_page)

      return {
        data: result.all(),
        meta: {
          total: result.total,
          per_page: result.perPage,
          current_page: result.currentPage,
          last_page: result.lastPage,
        },
      }
    })
  }
}
