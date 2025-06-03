import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import FlaggedReview from '#models/flagged_review'

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
    const query = FlaggedReview.query()
      .preload('skill_review', (srQuery) => {
        void srQuery
          .preload('reviewer', (uQuery) => {
            void uQuery.select(['id', 'username', 'email'])
          })
          .preload('review_session', (rsQuery) => {
            void rsQuery.preload('reviewee', (uQuery) => {
              void uQuery.select(['id', 'username', 'email'])
            })
          })
          .preload('skill', (sQuery) => {
            void sQuery.select(['id', 'name', 'category'])
          })
      })
      .preload('reviewer', (uQuery) => {
        void uQuery.select(['id', 'username', 'email'])
      })
      .orderBy('created_at', 'desc')

    if (dto.status) {
      void query.where('status', dto.status)
    }

    const paginated = await query.paginate(dto.page, dto.per_page)

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
