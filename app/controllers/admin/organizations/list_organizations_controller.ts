import type { HttpContext } from '@adonisjs/core/http'

import ListOrganizationsQuery from '#actions/admin/organizations/queries/list_organizations_query'
import { PAGINATION } from '#constants/common_constants'
import { ExecutionContext } from '#types/execution_context'

const ADMIN_ORGANIZATIONS_PER_PAGE = 24

/**
 * ListOrganizationsController
 *
 * Show list of all organizations (System Admin only)
 *
 * GET /admin/organizations
 */
export default class ListOrganizationsController {
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

    const page = toPageNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown)
    const search = toOptionalString(request.input('search', '') as unknown)

    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new ListOrganizationsQuery(execCtx)

    const result = await query.handle({
      page,
      perPage: ADMIN_ORGANIZATIONS_PER_PAGE,
      search,
    })

    // Need to enhance data with owner and counts
    // Since the query doesn't preload these yet
    return inertia.render('admin/organizations/index', {
      organizations: result.data,
      pagination: result.meta,
      filters: { search: search ?? '' },
    })
  }
}
