import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/access/organization_constants'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationAdministrationRepository } from '#modules/organizations/actions/ports/outbound/dashboard/organization_administration_repository'
import type { OrganizationMemberInsightsReader } from '#modules/organizations/actions/ports/outbound/dashboard/organization_member_insights_reader'
import type { OrganizationMembershipRepository } from '#modules/organizations/actions/ports/outbound/dashboard/organization_persistence'
import type { OrganizationPortfolioStatsReader } from '#modules/organizations/actions/ports/outbound/dashboard/organization_portfolio_stats_reader'
import { BaseQuery } from '#modules/organizations/actions/queries/base_query'

/**
 * GetOrganizationDashboardStatsQuery (Organization Admin)
 *
 * Get organization-specific statistics for org admin dashboard.
 * Uses repositories (Infrastructure layer) for all DB queries.
 */

export interface GetOrganizationDashboardStatsDTO {
  organizationId: string
}

export interface GetOrganizationDashboardStatsResult {
  members: {
    total: number
    by_role: {
      org_owner: number
      org_admin: number
      org_member: number
    }
    pending_invitations: number
    reviewed_members: number
    imported_only_members: number
    under_dispute_members: number
  }
  projects: {
    total: number
    active: number
    completed: number
  }
  tasks: {
    total: number
    in_progress: number
    completed: number
    overdue: number
  }
}

export default class GetOrganizationDashboardStatsQuery extends BaseQuery<
  GetOrganizationDashboardStatsDTO,
  GetOrganizationDashboardStatsResult
> {
  constructor(
    execCtx: OrganizationActionContext,
    private readonly administration: OrganizationAdministrationRepository,
    private readonly portfolioStats: OrganizationPortfolioStatsReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly memberInsights: OrganizationMemberInsightsReader
  ) {
    super(execCtx)
  }

  async handle(
    dto: GetOrganizationDashboardStatsDTO
  ): Promise<GetOrganizationDashboardStatsResult> {
    const orgId = dto.organizationId
    const actorId = this.getCurrentUserId()
    if (!actorId) {
      throw new UnauthorizedException()
    }
    const memberUserIds = await this.memberships.listMemberUserIds(
      orgId,
      OrganizationUserStatus.APPROVED
    )

    // Fetch stats from repositories (Infrastructure layer)
    const [memberStats, projectStats, taskStats, memberInsights] = await Promise.all([
      this.administration.getMemberStats(orgId),
      this.portfolioStats.loadProjectDashboardStats(orgId, actorId),
      this.portfolioStats.loadTaskDashboardStats(orgId, actorId),
      this.memberInsights.loadForMemberUserIds(memberUserIds),
    ])

    return {
      members: {
        total: memberStats.total,
        by_role: memberStats.byRole,
        pending_invitations: memberStats.pendingInvitations,
        reviewed_members: memberInsights.reviewedMembers,
        imported_only_members: memberInsights.importedOnlyMembers,
        under_dispute_members: memberInsights.underDisputeMembers,
      },
      projects: {
        total: projectStats.total,
        active: projectStats.active,
        completed: projectStats.completed,
      },
      tasks: {
        total: taskStats.total,
        in_progress: taskStats.inProgress,
        completed: taskStats.completed,
        overdue: taskStats.overdue,
      },
    }
  }
}
