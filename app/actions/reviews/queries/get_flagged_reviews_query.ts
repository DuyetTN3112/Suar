import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import type FlaggedReview from '#models/flagged_review'
import FlaggedReviewRepository from '#infra/reviews/repositories/flagged_review_repository'

interface GetFlaggedReviewsDTO {
  page: number
  per_page: number
  status?: string
}

interface GetFlaggedReviewsResult {
  data: FlaggedReview[]
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
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

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
