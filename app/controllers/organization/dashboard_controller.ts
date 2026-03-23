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
  async handle({ inertia, auth, request }: HttpContext) {
    const execCtx = ExecutionContext.fromHttp({ auth, request })
    const user = auth.getUserOrFail()

    if (!user.current_organization_id) {
      return inertia.render('org/no_org')
    }

    const query = new GetOrganizationDashboardStatsQuery(execCtx)
    const stats = await query.execute({
      organizationId: user.current_organization_id,
    })

    return inertia.render('org/dashboard', {
      stats,
    })
  }
}
