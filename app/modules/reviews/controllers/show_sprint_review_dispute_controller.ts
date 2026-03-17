import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetSprintReviewDisputeDetailQuery from '#modules/reviews/actions/queries/get_sprint_review_dispute_detail_query'

export default class ShowSprintReviewDisputeController {
  async handle(ctx: HttpContext) {
    const dispute = await new GetSprintReviewDisputeDetailQuery(actionContextFromHttp(ctx)).handle(
      String(ctx.params['disputeId'])
    )

    return ctx.inertia.render('reviews/sprint-disputes/show', {
      dispute,
    })
  }
}
