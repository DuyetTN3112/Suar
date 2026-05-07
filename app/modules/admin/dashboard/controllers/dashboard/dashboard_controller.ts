import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/dashboard/actions/dtos/common/admin_pagination'
import { AdminDashboardActionFactory } from '#modules/admin/dashboard/actions/ports/inbound/admin_dashboard_action_factory'
import { mapAdminDashboardStatsResponse } from '#modules/admin/dashboard/controllers/mappers/response/dashboard/admin_api_response_mapper'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { normalizePagination, toCanonicalPagePagination  } from '#modules/pagination/public_contracts/pagination_public_api'


/**
 * AdminDashboardController
 *
 * System Admin dashboard - overview of platform statistics
 */

@inject()
export default class AdminDashboardController {
  constructor(private readonly actions: AdminDashboardActionFactory) {}

  private async getStats(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeGetDashboardStatsQuery(execCtx)

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

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(mapAdminDashboardStatsResponse(stats)))
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
    const { inertia, request } = ctx
    const stats = await this.getStats(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const subscriptionsQuery = this.actions.makeListSubscriptionsQuery(execCtx)
    const pagination = normalizePagination(
      {
        page: request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: request.input(
          'perPage',
          request.input('per_page', PAGINATION.DEFAULT_PER_PAGE)
        ) as unknown,
      },
      PAGINATION
    )
    const subscriptionData = await subscriptionsQuery.handle({
      page: pagination.page,
      perPage: pagination.perPage,
    })

    return inertia.render('admin/dashboards/subscriptions', {
      stats,
      subscriptionStats: subscriptionData.stats,
      subscriptions: subscriptionData.subscriptions,
      pagination: toCanonicalPagePagination(subscriptionData.meta),
    })
  }
}
