import { paginateWithRelations } from '#modules/reviews/infra/repositories/read/flagged_review_queries'

export async function paginateFlaggedReviewsForAdmin(
  page: number,
  perPage: number,
  status?: string,
  after?: string,
  before?: string,
  filters?: {
    search?: string
    flagType?: string
    severity?: string
  }
) {
  return paginateWithRelations(
    page,
    perPage,
    status,
    after,
    before,
    undefined,
    filters
  )
}
