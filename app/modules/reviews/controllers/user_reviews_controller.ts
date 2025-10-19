import type { HttpContext } from '@adonisjs/core/http'


import { buildGetUserReviewsDTO } from './mappers/request/review_request_mapper.js'
import { mapUserReviewsPageProps } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetUserReviewsQuery from '#modules/reviews/actions/queries/get_user_reviews_query'

/**
 * GET /users/:id/reviews → View user's reviews (public profile)
 */
export default class UserReviewsController {
  async handle(ctx: HttpContext) {
    const { request, params, inertia } = ctx

    const userId = params['userId'] as string
    const dto = buildGetUserReviewsDTO(request, userId)

    const query = new GetUserReviewsQuery(actionContextFromHttp(ctx))
    const result = await query.handle(dto)

    return inertia.render('reviews/user-reviews', mapUserReviewsPageProps(result, userId))
  }
}
