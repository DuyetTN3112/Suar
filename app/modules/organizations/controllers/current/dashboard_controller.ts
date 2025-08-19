import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetOrganizationDashboardStatsQuery from '#modules/organizations/actions/current/dashboard/get_organization_dashboard_stats_query'

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
    const execCtx = actionContextFromHttp(ctx)
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
