import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUserReviewsQuery from '#actions/reviews/queries/get_user_reviews_query'
import { GetUserReviewsDTO } from '#actions/reviews/dtos/request/review_dtos'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { PAGINATION } from '#constants/common_constants'

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
      page: request.input('page', PAGINATION.DEFAULT_PAGE) as number,
      per_page: request.input('per_page', PAGINATION.DEFAULT_PER_PAGE) as number,
    })

    const query = new GetUserReviewsQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(dto)

    return inertia.render('reviews/my-reviews', {
      reviews: result.data.map((r) => r.serialize()),
      meta: result.meta,
    })
  }
}
