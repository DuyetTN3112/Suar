import type { HttpContext } from '@adonisjs/core/http'


import { buildPendingReviewsInput } from './mappers/request/review_request_mapper.js'
import { mapPendingReviewsPageProps } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetPendingReviewsQuery from '#modules/reviews/actions/queries/get_pending_reviews_query'

/**
 * GET /reviews/pending → List pending reviews for current user
 */
export default class ListPendingReviewsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const query = new GetPendingReviewsQuery(actionContextFromHttp(ctx))
    const result = await query.handle(buildPendingReviewsInput(request))

    return inertia.render('reviews/pending', mapPendingReviewsPageProps(result))
  }
}
