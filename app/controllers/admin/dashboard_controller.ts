import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetDashboardStatsQuery from '#actions/admin/dashboard/get_dashboard_stats_query'
import ListSubscriptionsQuery from '#actions/admin/packages/queries/list_subscriptions_query'

/**
 * AdminDashboardController
 *
 * System Admin dashboard - overview of platform statistics
 */
export default class AdminDashboardController {
  private async getStats(ctx: HttpContext) {
    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetDashboardStatsQuery(execCtx)

    return query.handle()
  }

  /**
   * Show system admin dashboard
   *
   * GET /admin
   */
  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const stats = await this.getStats(ctx)

    return inertia.render('admin/dashboard', {
      stats,
    })
  }

  async users(ctx: HttpContext) {
    const { inertia } = ctx
    const stats = await this.getStats(ctx)

    return inertia.render('admin/dashboards/users', {
      stats,
    })
  }

  async operations(ctx: HttpContext) {
    const { inertia } = ctx
    const stats = await this.getStats(ctx)

    return inertia.render('admin/dashboards/operations', {
      stats,
    })
  }

  async subscriptions(ctx: HttpContext) {
    const { inertia } = ctx
    const stats = await this.getStats(ctx)
    const execCtx = ExecutionContext.fromHttp(ctx)
    const subscriptionsQuery = new ListSubscriptionsQuery(execCtx)
    const subscriptionData = await subscriptionsQuery.handle({
      page: 1,
      perPage: 20,
    })

    return inertia.render('admin/dashboards/subscriptions', {
      stats,
      subscriptionStats: subscriptionData.stats,
      subscriptions: subscriptionData.subscriptions,
    })
  }
}
