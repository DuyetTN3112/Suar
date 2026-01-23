import type { OrganizationActionContext } from '#modules/organizations/dashboard/actions/action_context'
import { OrganizationDashboardQueryFactory } from '#modules/organizations/dashboard/actions/ports/inbound/organization_dashboard_query_factory'
import type { OrganizationAdministrationRepository } from '#modules/organizations/dashboard/actions/ports/outbound/organization_administration_repository'
import type { OrganizationMemberInsightsReader } from '#modules/organizations/dashboard/actions/ports/outbound/organization_member_insights_reader'
import type { OrganizationMembershipRepository } from '#modules/organizations/dashboard/actions/ports/outbound/organization_persistence'
import type { OrganizationPortfolioStatsReader } from '#modules/organizations/dashboard/actions/ports/outbound/organization_portfolio_stats_reader'
import GetOrganizationDashboardStatsQuery from '#modules/organizations/dashboard/actions/query/get_organization_dashboard_stats_query'

export class ComposedOrganizationDashboardQueryFactory extends OrganizationDashboardQueryFactory {
  constructor(
    private readonly administration: OrganizationAdministrationRepository,
    private readonly portfolioStats: OrganizationPortfolioStatsReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly memberInsights: OrganizationMemberInsightsReader
  ) {
    super()
  }

  makeDashboardStats(context: OrganizationActionContext): GetOrganizationDashboardStatsQuery {
    return new GetOrganizationDashboardStatsQuery(
      context,
      this.administration,
      this.portfolioStats,
      this.memberships,
      this.memberInsights
    )
  }
}
