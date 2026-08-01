import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminReviewActionFactory } from '#modules/admin/reviews/actions/ports/inbound/admin_review_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

@inject()
export default class ShowFlaggedReviewController {
  constructor(private readonly actions: AdminReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, params } = ctx
    const query = this.actions.makeGetFlaggedReviewDetailQuery(actionContextFromHttp(ctx))
    const result = await query.handle({ id: String(params['flaggedReviewId']) })

    return inertia.render('admin/reviews/show', result)
  }
}
