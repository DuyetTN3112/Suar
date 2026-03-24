import type { HttpContext } from '@adonisjs/core/http'
import ListOrganizationsQuery from '#actions/admin/organizations/queries/list_organizations_query'
import { ExecutionContext } from '#types/execution_context'

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
    const page = request.input('page', 1)
    const search = request.input('search', '')
    const plan = request.input('plan', null)

    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new ListOrganizationsQuery(execCtx)

    const result = await query.handle({
      page,
      perPage: 24,
      search,
      plan,
    })

    // Need to enhance data with owner and counts
    // Since the query doesn't preload these yet
    return inertia.render('admin/organizations/index', {
      organizations: result.data,
      pagination: result.meta,
      filters: { search, plan },
    })
  }
}
