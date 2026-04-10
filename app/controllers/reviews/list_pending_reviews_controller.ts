import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetPendingReviewsQuery from '#actions/reviews/queries/get_pending_reviews_query'
import { buildPendingReviewsInput } from './mappers/request/review_request_mapper.js'
import { mapPendingReviewsPageProps } from './mappers/response/review_response_mapper.js'

/**
 * GET /reviews/pending → List pending reviews for current user
 */
export default class ListPendingReviewsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const query = new GetPendingReviewsQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(buildPendingReviewsInput(request))

    return inertia.render('reviews/pending', mapPendingReviewsPageProps(result))
  }
}
