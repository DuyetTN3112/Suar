import { buildPaginationMeta } from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/reviews/actions/base_query'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'

interface PendingReviewsDTO {
  page: number
  per_page: number
  after?: string
  before?: string
}

interface PendingReviewsResult {
  data: ReviewSessionRecord[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    cursor: {
      next_cursor: string | null
      previous_cursor: string | null
      has_next_page: boolean
      has_previous_page: boolean
    }
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
  async handle(dto: PendingReviewsDTO): Promise<PendingReviewsResult> {
    const userId = this.getCurrentUserId()
    const currentPage = dto.after || dto.before ? 1 : dto.page

    if (!userId) {
      return {
        data: [],
        meta: {
          total: 0,
          per_page: dto.per_page,
          current_page: currentPage,
          last_page: 1,
          cursor: {
            next_cursor: null,
            previous_cursor: null,
            has_next_page: false,
            has_previous_page: false,
          },
        },
      }
    }

    const cacheKey = this.generateCacheKey('user:pending_reviews', {
      userId,
      perPage: dto.per_page,
      after: dto.after ?? '',
      before: dto.before ?? '',
    })

    return await this.executeWithCache(cacheKey, 60, async () => {
      const result = await ReviewSessionRepository.findPendingForReviewerCursor(userId, {
        limit: dto.per_page,
        after: dto.after ?? null,
        before: dto.before ?? null,
      })
      const meta = buildPaginationMeta(result.total, {
        page: currentPage,
        perPage: dto.per_page,
      })

      return {
        data: result.data,
        meta: {
          total: meta.total,
          per_page: meta.perPage,
          current_page: meta.currentPage,
          last_page: meta.lastPage,
          cursor: {
            next_cursor: result.nextCursor,
            previous_cursor: result.previousCursor,
            has_next_page: result.hasNextPage,
            has_previous_page: result.hasPreviousPage,
          },
        },
      }
    })
  }
}
