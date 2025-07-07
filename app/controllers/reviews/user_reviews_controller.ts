import type { HttpContext } from '@adonisjs/core/http'

import { buildGetUserReviewsDTO } from './mappers/request/review_request_mapper.js'
import { mapUserReviewsPageProps } from './mappers/response/review_response_mapper.js'

import GetUserReviewsQuery from '#actions/reviews/queries/get_user_reviews_query'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /users/:id/reviews → View user's reviews (public profile)
 */
export default class UserReviewsController {
  async handle(ctx: HttpContext) {
    const { request, params, inertia } = ctx

    const userId = params.id as string
    const dto = buildGetUserReviewsDTO(request, userId)

    const query = new GetUserReviewsQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(dto)

    return inertia.render('reviews/user-reviews', mapUserReviewsPageProps(result, userId))
  }
}
