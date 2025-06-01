import type { HttpContext } from '@adonisjs/core/http'
import GetPendingReviewsQuery from '#actions/reviews/queries/get_pending_reviews_query'

/**
 * GET /reviews/pending → List pending reviews for current user
 */
export default class ListPendingReviewsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const query = new GetPendingReviewsQuery(ctx)
    const result = await query.handle({
      page: request.input('page', 1) as number,
      per_page: request.input('per_page', 20) as number,
    })

    return inertia.render('reviews/pending', {
      reviews: result.data.map((r) => r.serialize()),
      meta: result.meta,
    })
  }
}
