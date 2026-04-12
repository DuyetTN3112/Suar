import type { HttpContext } from '@adonisjs/core/http'

import { buildFlaggedReviewsInput } from './mappers/request/review_request_mapper.js'
import { mapFlaggedReviewsPageProps } from './mappers/response/review_response_mapper.js'

import GetFlaggedReviewsQuery from '#actions/reviews/queries/get_flagged_reviews_query'
import { FlaggedReviewStatus } from '#constants/review_constants'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /admin/flagged-reviews → List flagged reviews for admin review
 */
export default class ListFlaggedReviewsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const filters = buildFlaggedReviewsInput(request)

    const query = new GetFlaggedReviewsQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle({
      page: filters.page,
      per_page: filters.per_page,
      status: filters.status,
    })

    return inertia.render(
      'reviews/flagged',
      mapFlaggedReviewsPageProps(result, Object.values(FlaggedReviewStatus), filters.status ?? null)
    )
  }
}
