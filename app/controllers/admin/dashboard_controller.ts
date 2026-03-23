import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetDashboardStatsQuery from '#actions/admin/dashboard/get_dashboard_stats_query'

/**
 * AdminDashboardController
 *
 * System Admin dashboard - overview of platform statistics
 */
export default class AdminDashboardController {
  /**
   * Show system admin dashboard
   *
   * GET /admin
   */
  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetDashboardStatsQuery(execCtx)

    const stats = await query.handle()

    return inertia.render('admin/dashboard', {
      stats,
    })
  }
}
