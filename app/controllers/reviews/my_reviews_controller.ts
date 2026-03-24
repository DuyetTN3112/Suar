import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUserReviewsQuery from '#actions/reviews/queries/get_user_reviews_query'
import { GetUserReviewsDTO } from '#actions/reviews/dtos/request/review_dtos'
import UnauthorizedException from '#exceptions/unauthorized_exception'

/**
 * GET /my-reviews → Get my reviews (as reviewee)
 */
export default class MyReviewsController {
  async handle(ctx: HttpContext) {
    const { request, inertia, auth } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const dto = new GetUserReviewsDTO({
      user_id: auth.user.id,
      page: request.input('page', 1) as number,
      per_page: request.input('per_page', 20) as number,
    })

    const query = new GetUserReviewsQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(dto)

    return inertia.render('reviews/my-reviews', {
      reviews: result.data.map((r) => r.serialize()),
      meta: result.meta,
    })
  }
}
