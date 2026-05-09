import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminReviewActionFactory } from '#modules/admin/reviews/actions/ports/inbound/reviews/admin_review_action_factory'
import { buildFlaggedReviewListRequest } from '#modules/admin/reviews/controllers/mappers/request/reviews/flagged_review_list_request_mapper'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

/**
 * ListFlaggedReviewsController
 *
 * Show flagged reviews
 *
 * GET /admin/reviews
 */
@inject()
export default class ListFlaggedReviewsController {
  constructor(private readonly actions: AdminReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeListFlaggedReviewsQuery(execCtx)
    const { page, perPage, after, before, search, flagType, severity, status } =
      buildFlaggedReviewListRequest(request)

    const result = await query
      .executeAndWrap({
        page,
        perPage,
        after: after ?? null,
        before: before ?? null,
        ...(search ? { search } : {}),
        ...(flagType ? { flagType } : {}),
        ...(severity ? { severity } : {}),
        ...(status ? { status } : {}),
      })
      .then((outcome) => outcome.getValue())

    return inertia.render('reviews/flagged', {
      reviews: result.data,
      pagination: toCanonicalPagePagination(result.meta),
      filters: {
        search: search ?? '',
        after,
        before,
        flag_type: flagType ?? null,
        severity: severity ?? null,
        status: status ?? null,
      },
    })
  }
}
