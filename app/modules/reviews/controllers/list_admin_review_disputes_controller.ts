import type { HttpContext } from '@adonisjs/core/http'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListAdminReviewDisputesQuery from '#modules/reviews/actions/queries/list_admin_review_disputes_query'

export default class ListAdminReviewDisputesController {
  async handle(ctx: HttpContext) {
    const page = Number(ctx.request.input('page', 1))
    const perPage = Number(ctx.request.input('per_page', 20))
    const status = ctx.request.input('status', null) as string | null
    const search = ctx.request.input('search', null) as string | null

    const result = await new ListAdminReviewDisputesQuery(actionContextFromHttp(ctx)).execute({
      page: Number.isFinite(page) ? page : 1,
      per_page: Number.isFinite(perPage) ? perPage : 20,
      status,
      search,
    })

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      meta: result.meta,
    })
  }
}
