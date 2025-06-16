import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import AdminUserRepository from '#infra/admin/repositories/admin_user_repository'
import AdminOrganizationRepository from '#infra/admin/repositories/admin_organization_repository'
import AdminProjectRepository from '#infra/admin/repositories/admin_project_repository'
import AdminTaskRepository from '#infra/admin/repositories/admin_task_repository'

/**
 * GetDashboardStatsQuery (System Admin)
 *
 * Get system-wide statistics for admin dashboard.
 * Uses repositories (Infrastructure layer) for all DB queries.
 */

export interface GetDashboardStatsResult {
  users: {
    total: number
    active: number
    suspended: number
    new_this_month: number
  }
  organizations: {
    total: number
    by_plan: {
      free: number
      starter: number
      professional: number
      enterprise: number
    }
    new_this_month: number
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
  }
}

export default class GetDashboardStatsQuery extends BaseQuery<{}, GetDashboardStatsResult> {
  constructor(
    execCtx: ExecutionContext,
    private userRepo = new AdminUserRepository(),
    private orgRepo = new AdminOrganizationRepository(),
    private projectRepo = new AdminProjectRepository(),
    private taskRepo = new AdminTaskRepository()
  ) {
    super(execCtx)
  }

  async handle(_dto?: {}): Promise<GetDashboardStatsResult> {
    // Fetch stats from repositories (Infrastructure layer)
    const [userStats, orgStats, projectStats, taskStats] = await Promise.all([
      this.userRepo.getUserStats(),
      this.orgRepo.getOrganizationStats(),
      this.projectRepo.getProjectStats(),
      this.taskRepo.getTaskStats(),
    ])

    return {
      users: {
        total: userStats.total,
        active: userStats.active,
        suspended: userStats.suspended,
        new_this_month: userStats.newThisMonth,
      },
      organizations: {
        total: orgStats.total,
        by_plan: orgStats.byPlan,
        new_this_month: orgStats.newThisMonth,
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
      },
    }
  }
}
