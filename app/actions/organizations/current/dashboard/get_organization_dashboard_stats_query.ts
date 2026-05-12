import { BaseQuery } from '#actions/organizations/base_query'
import OrganizationMemberRepository from '#infra/organizations/current/repositories/organization_member_repository'
import OrganizationProjectRepository from '#infra/organizations/current/repositories/organization_project_repository'
import OrganizationTaskRepository from '#infra/organizations/current/repositories/organization_task_repository'
import type { ExecutionContext } from '#types/execution_context'

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
    execCtx: ExecutionContext,
    private memberRepo = new OrganizationMemberRepository(),
    private projectRepo = new OrganizationProjectRepository(),
    private taskRepo = new OrganizationTaskRepository()
  ) {
    super(execCtx)
  }

  async handle(
    dto: GetOrganizationDashboardStatsDTO
  ): Promise<GetOrganizationDashboardStatsResult> {
    const orgId = dto.organizationId

    // Fetch stats from repositories (Infrastructure layer)
    const [memberStats, projectStats, taskStats] = await Promise.all([
      this.memberRepo.getMemberStats(orgId),
      this.projectRepo.getProjectStats(orgId),
      this.taskRepo.getTaskStats(orgId),
    ])

    return {
      members: {
        total: memberStats.total,
        by_role: memberStats.byRole,
        pending_invitations: memberStats.pendingInvitations,
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
