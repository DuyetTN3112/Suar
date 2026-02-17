import type { HttpContext } from '@adonisjs/core/http'

import GetFlaggedReviewDetailQuery from '#modules/admin/actions/reviews/queries/get_flagged_review_detail_query'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'


export default class ShowFlaggedReviewController {
  async handle(ctx: HttpContext) {
    const { inertia, params } = ctx
    const query = new GetFlaggedReviewDetailQuery(actionContextFromHttp(ctx))
    const result = await query.handle({ id: String(params['flaggedReviewId']) })

    return inertia.render('reviews/show', result)
  }
}
