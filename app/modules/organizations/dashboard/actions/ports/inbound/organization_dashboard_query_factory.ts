import type { OrganizationActionContext } from '#modules/organizations/dashboard/actions/action_context'
import type GetOrganizationDashboardStatsQuery from '#modules/organizations/dashboard/actions/query/get_organization_dashboard_stats_query'

/**
 * Inbound construction contract for organization dashboard queries.
 */
export abstract class OrganizationDashboardQueryFactory {
  abstract makeDashboardStats(
    context: OrganizationActionContext
  ): GetOrganizationDashboardStatsQuery
}
