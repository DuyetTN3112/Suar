import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetPendingReviewsQuery from '#actions/reviews/queries/get_pending_reviews_query'
import { PAGINATION } from '#constants/common_constants'

/**
 * GET /reviews/pending → List pending reviews for current user
 */
export default class ListPendingReviewsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const query = new GetPendingReviewsQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle({
      page: request.input('page', PAGINATION.DEFAULT_PAGE) as number,
      per_page: request.input('per_page', PAGINATION.DEFAULT_PER_PAGE) as number,
    })

    return inertia.render('reviews/pending', {
      reviews: result.data.map((r) => r.serialize()),
      meta: result.meta,
    })
  }
}
