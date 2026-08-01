import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminDisputeActionFactory } from '#modules/admin/disputes/actions/ports/inbound/admin_dispute_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import {
  normalizePagination,
  fromLegacySnakePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { REVIEW_PAGINATION } from '#modules/reviews/public_contracts/review_pagination'

@inject()
export default class AdminDisputesController {
  constructor(private readonly actions: AdminDisputeActionFactory) {}

  async index(ctx: HttpContext) {
    const { inertia, request } = ctx
    const after = request.input('after', null) as string | null
    const before = request.input('before', null) as string | null
    const status = request.input('status', null) as string | null
    const search = request.input('search', null) as string | null
    const requestedOutcome = request.input('requested_outcome', null) as string | null
    const finalDecision = request.input('final_decision', null) as string | null
    const pagination = normalizePagination(
      {
        page: request.input('page', REVIEW_PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: request.input(
          'perPage',
          request.input('per_page', REVIEW_PAGINATION.DEFAULT_PER_PAGE)
        ) as unknown,
      },
      REVIEW_PAGINATION
    )

    const execCtx = actionContextFromHttp(ctx)
    const result = await this.actions
      .makeListAdminDisputesQuery(execCtx)
      .handle({
        page: after || before ? REVIEW_PAGINATION.DEFAULT_PAGE : pagination.page,
        perPage: pagination.perPage,
        after,
        before,
        status,
        search,
        requestedOutcome,
        finalDecision,
      })

    return inertia.render('admin/disputes/index', {
      disputes: result.data,
      pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
      filters: {
        status,
        search,
        after,
        before,
        requested_outcome: requestedOutcome,
        final_decision: finalDecision,
      },
    })
  }

  async show(ctx: HttpContext) {
    const { inertia, params } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const result = await this.actions
      .makeGetAdminDisputeDetailQuery(execCtx)
      .handle({
        disputeId: params['disputeId'] as string,
      })

    return inertia.render('admin/disputes/show', result)
  }

  aiOperator(ctx: HttpContext) {
    const { request, response } = ctx
    const search = request.input('search', null) as string | null
    const status = request.input('status', null) as string | null
    const query = new URLSearchParams({ focus: 'ai' })
    if (search) query.set('search', search)
    if (status) query.set('status', status)

    return response.redirect(`/admin/disputes?${query.toString()}`)
  }
}
