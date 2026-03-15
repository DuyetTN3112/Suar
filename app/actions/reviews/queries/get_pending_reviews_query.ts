import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import ReviewSession from '#models/review_session'
import ReviewSessionRepository from '#repositories/review_session_repository'

interface PendingReviewsDTO {
  page: number
  per_page: number
}

interface PendingReviewsResult {
  data: ReviewSession[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

/**
 * GetPendingReviewsQuery
 *
 * Fetches review sessions that need the current user's review.
 */
export default class GetPendingReviewsQuery extends BaseQuery<
  PendingReviewsDTO,
  PendingReviewsResult
> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: PendingReviewsDTO): Promise<PendingReviewsResult> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      return {
        data: [],
        meta: { total: 0, per_page: dto.per_page, current_page: dto.page, last_page: 1 },
      }
    }

    const cacheKey = this.generateCacheKey('user:pending_reviews', {
      userId,
      page: dto.page,
    })

    return await this.executeWithCache(cacheKey, 60, async () => {
      const result = await ReviewSessionRepository.paginatePendingForReviewer(
        userId,
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
