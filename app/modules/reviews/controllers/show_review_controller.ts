import type { HttpContext } from '@adonisjs/core/http'

import { mapShowReviewPageProps } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetReviewShowPageQuery from '#modules/reviews/actions/queries/get_review_show_page_query'

/**
 * GET /reviews/:id → Show review session details
 */
export default class ShowReviewController {
  async handle(ctx: HttpContext) {
    const { params, inertia } = ctx
    const pageData = await new GetReviewShowPageQuery(actionContextFromHttp(ctx)).execute(
      params['reviewId'] as string
    )

    return inertia.render(
      'reviews/show',
      mapShowReviewPageProps(
        pageData.session,
        pageData.skills,
        pageData.proficiencyLevels,
        pageData.disputeId,
        pageData.taskComments
      )
    )
  }
}
