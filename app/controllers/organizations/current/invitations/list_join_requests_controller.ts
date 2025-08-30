import type { HttpContext } from '@adonisjs/core/http'

import ListJoinRequestsQuery from '#actions/organizations/current/invitations/queries/list_join_requests_query'
import { PAGINATION } from '#constants/common_constants'
import { ExecutionContext } from '#types/execution_context'

const ORG_JOIN_REQUESTS_PER_PAGE = 50

/**
 * ListJoinRequestsController
 *
 * Show pending join requests
 *
 * GET /org/invitations/requests
 */
export default class ListJoinRequestsController {
  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx

    const toPageNumber = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(1, Math.trunc(value))
      }
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1
      }
      return 1
    }

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new ListJoinRequestsQuery(execCtx)
    const result = await query.handle({
      page: toPageNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown),
      perPage: ORG_JOIN_REQUESTS_PER_PAGE,
      search: toOptionalString(request.input('search', '') as unknown),
    })

    return inertia.render('org/invitations/requests', result)
  }
}
