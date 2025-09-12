import { BaseQuery } from '#actions/reviews/base_query'
import FlaggedReviewRepository from '#infra/reviews/repositories/flagged_review_repository'
import type { FlaggedReviewRecord } from '#types/review_records'

interface GetFlaggedReviewsDTO {
  page: number
  per_page: number
  status?: string
}

interface GetFlaggedReviewsResult {
  data: FlaggedReviewRecord[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
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
      dto.status
    )

    return {
      data: paginated.all(),
      meta: {
        total: paginated.total,
        per_page: paginated.perPage,
        current_page: paginated.currentPage,
        last_page: paginated.lastPage,
      },
    }
  }
}
