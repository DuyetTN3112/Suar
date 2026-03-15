import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import type ReviewSession from '#models/review_session'
import type { GetUserReviewsDTO } from '#actions/reviews/dtos/request/review_dtos'
import ReviewSessionRepository from '#repositories/review_session_repository'

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
      const result = await ReviewSessionRepository.paginateByReviewee(
        dto.user_id,
        dto.page,
        dto.per_page
      )

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
