import type { HttpContext } from '@adonisjs/core/http'

import { buildGetUserReviewsDTO } from './mappers/request/review_request_mapper.js'
import { mapMyReviewsPageProps } from './mappers/response/review_response_mapper.js'

import GetUserReviewsQuery from '#actions/reviews/queries/get_user_reviews_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /my-reviews → Get my reviews (as reviewee)
 */
export default class MyReviewsController {
  async handle(ctx: HttpContext) {
    const { request, inertia, auth } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const dto = buildGetUserReviewsDTO(request, auth.user.id)

    const query = new GetUserReviewsQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(dto)

    return inertia.render('reviews/my-reviews', mapMyReviewsPageProps(result))
  }
}
