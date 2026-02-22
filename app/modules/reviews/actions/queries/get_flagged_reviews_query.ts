import { BaseQuery } from '#modules/reviews/actions/base_query'
import FlaggedReviewRepository from '#modules/reviews/infra/repositories/flagged_review_repository'
import type { FlaggedReviewRecord } from '#modules/reviews/types/review_records'

interface GetFlaggedReviewsDTO {
  page: number
  per_page: number
  after?: string
  before?: string
  status?: string
}

interface GetFlaggedReviewsResult {
  data: FlaggedReviewRecord[]
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
 * GetFlaggedReviewsQuery
 *
 * Fetches flagged reviews for admin review panel.
 * Can filter by status (pending, reviewed, dismissed, confirmed).
 */
export default class GetFlaggedReviewsQuery extends BaseQuery<
  GetFlaggedReviewsDTO,
  GetFlaggedReviewsResult
> {
  async handle(dto: GetFlaggedReviewsDTO): Promise<GetFlaggedReviewsResult> {
    const paginated = await FlaggedReviewRepository.paginateWithRelations(
      dto.page,
      dto.per_page,
      dto.status,
      dto.after,
      dto.before
    )

    return {
      data: paginated.data,
      meta: {
        total: paginated.total,
        per_page: paginated.perPage,
        current_page: paginated.currentPage,
        last_page: paginated.lastPage,
        cursor: {
          next_cursor: paginated.nextCursor,
          previous_cursor: paginated.previousCursor,
          has_next_page: paginated.hasNextPage,
          has_previous_page: paginated.hasPreviousPage,
        },
      },
    }
  }
}
