import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetOrganizationDashboardStatsQuery from '#actions/organization/dashboard/get_organization_dashboard_stats_query'

/**
 * OrgDashboardController
 *
 * Show organization dashboard
 *
 * GET /org
 */
export default class OrgDashboardController {
  async handle(ctx: HttpContext) {
    const { inertia, auth } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const { user } = auth

    if (!user) {
      return inertia.render('org/no_org', {})
    }

    if (!user.current_organization_id) {
      return inertia.render('org/no_org', {})
    }

    const query = new GetOrganizationDashboardStatsQuery(execCtx)
    const stats = await query.handle({
      organizationId: user.current_organization_id,
    })

    return inertia.render('org/dashboard', {
      stats,
    })
  }
}
