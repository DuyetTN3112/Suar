import type { HttpContext } from '@adonisjs/core/http'

import GetFlaggedReviewDetailQuery from '#actions/admin/reviews/queries/get_flagged_review_detail_query'
import { ExecutionContext } from '#types/execution_context'

export default class ShowFlaggedReviewController {
  async handle(ctx: HttpContext) {
    const { inertia, params } = ctx
    const query = new GetFlaggedReviewDetailQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle({ id: String(params.id) })

    return inertia.render('admin/reviews/show', result)
  }
}
