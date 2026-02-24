import type { HttpContext } from '@adonisjs/core/http'


import { buildGetUserReviewsDTO } from './mappers/request/review_request_mapper.js'
import { mapMyReviewsPageProps } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetUserReviewsQuery from '#modules/reviews/actions/queries/get_user_reviews_query'

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

    const query = new GetUserReviewsQuery(actionContextFromHttp(ctx))
    const result = await query.handle(dto)

    return inertia.render('reviews/my-reviews', mapMyReviewsPageProps(result))
  }
}
