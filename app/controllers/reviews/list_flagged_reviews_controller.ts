import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetFlaggedReviewsQuery from '#actions/reviews/queries/get_flagged_reviews_query'
import { FlaggedReviewStatus } from '#constants/review_constants'

/**
 * GET /admin/flagged-reviews → List flagged reviews for admin review
 */
export default class ListFlaggedReviewsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))
    const status = request.input('status') as string | undefined

    const query = new GetFlaggedReviewsQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle({
      page,
      per_page: perPage,
      status,
    })

    return inertia.render('reviews/flagged', {
      flaggedReviews: result.data,
      meta: result.meta,
      statuses: Object.values(FlaggedReviewStatus),
      currentStatus: status || null,
    })
  }
}
