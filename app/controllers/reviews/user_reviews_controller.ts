import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUserReviewsQuery from '#actions/reviews/queries/get_user_reviews_query'
import { GetUserReviewsDTO } from '#actions/reviews/dtos/request/review_dtos'
import { PAGINATION } from '#constants/common_constants'

/**
 * GET /users/:id/reviews → View user's reviews (public profile)
 */
export default class UserReviewsController {
  async handle(ctx: HttpContext) {
    const { request, params, inertia } = ctx

    const dto = new GetUserReviewsDTO({
      user_id: params.id as string,
      page: request.input('page', PAGINATION.DEFAULT_PAGE) as number,
      per_page: request.input('per_page', PAGINATION.DEFAULT_PER_PAGE) as number,
    })

    const query = new GetUserReviewsQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(dto)

    return inertia.render('reviews/user-reviews', {
      userId: params.id as string,
      reviews: result.data.map((r) => r.serialize()),
      meta: result.meta,
    })
  }
}
