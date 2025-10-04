import type { HttpContext } from '@adonisjs/core/http'

import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
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

    const organizationId = resolveCurrentOrganizationId(ctx)
    if (!organizationId) {
      return inertia.render('org/no_org', {})
    }

    const query = new GetOrganizationDashboardStatsQuery(execCtx)
    const stats = await query.handle({
      organizationId,
    })

    return inertia.render('org/dashboard', {
      stats,
    })
  }
}
