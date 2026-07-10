import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildGetUserReviewsDTO } from '../mappers/request/review-core/review_request_mapper.js'
import { mapUserReviewsPageProps } from '../mappers/response/review-core/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

/**
 * GET /users/:id/reviews → View user's reviews (public profile)
 */
@inject()
export default class UserReviewsController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, params, inertia } = ctx

    const userId = params['userId'] as string
    const dto = buildGetUserReviewsDTO(request, userId)

    const query = this.actions.makeGetUserReviewsQuery(actionContextFromHttp(ctx))
    const result = await query.executeAndWrap(dto).then((outcome) => outcome.getValue())

    return inertia.render('reviews/user-reviews', mapUserReviewsPageProps(result, userId))
  }
}
