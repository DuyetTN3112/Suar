import type { AdminActionContext as DashboardActionContext } from '#modules/admin/dashboard/actions/action_context'
import type GetDashboardStatsQuery from '#modules/admin/dashboard/actions/query/get_dashboard_stats_query'
import type { AdminActionContext as PackageActionContext } from '#modules/admin/packages/actions/action_context'
import type ListSubscriptionsQuery from '#modules/admin/packages/actions/query/list_subscriptions_query'

export abstract class AdminDashboardActionFactory {
  abstract makeGetDashboardStatsQuery(
    execCtx: DashboardActionContext
  ): GetDashboardStatsQuery

  abstract makeListSubscriptionsQuery(
    execCtx: PackageActionContext
  ): ListSubscriptionsQuery
}
