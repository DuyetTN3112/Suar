import type { HttpContext } from '@adonisjs/core/http'


import GetDashboardStatsQuery from '#modules/admin/actions/dashboard/get_dashboard_stats_query'
import ListSubscriptionsQuery from '#modules/admin/actions/packages/queries/list_subscriptions_query'
import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'

/**
 * AdminDashboardController
 *
 * System Admin dashboard - overview of platform statistics
 */
export default class AdminDashboardController {
  private async getStats(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
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

  async apiDashboard(ctx: HttpContext) {
    const stats = await this.getStats(ctx)

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: stats,
    });
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
    const execCtx = actionContextFromHttp(ctx)
    const subscriptionsQuery = new ListSubscriptionsQuery(execCtx)
    const subscriptionData = await subscriptionsQuery.handle({
      page: PAGINATION.DEFAULT_PAGE,
      perPage: PAGINATION.DEFAULT_PER_PAGE,
    })

    return inertia.render('admin/dashboards/subscriptions', {
      stats,
      subscriptionStats: subscriptionData.stats,
      subscriptions: subscriptionData.subscriptions,
    })
  }
}
