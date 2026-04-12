import { BaseQuery } from '#actions/shared/base_query'
import AdminFlaggedReviewRepository from '#infra/admin/repositories/admin_flagged_review_repository'
import AdminOrganizationRepository from '#infra/admin/repositories/admin_organization_repository'
import AdminProjectRepository from '#infra/admin/repositories/admin_project_repository'
import AdminSubscriptionRepository from '#infra/admin/repositories/admin_subscription_repository'
import AdminTaskRepository from '#infra/admin/repositories/admin_task_repository'
import AdminUserRepository from '#infra/admin/repositories/admin_user_repository'
import type { ExecutionContext } from '#types/execution_context'

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
  subscriptions: {
    total: number
    active: number
    expiring_soon: number
    pro: number
    promax: number
  }
  moderation: {
    pending_flagged_reviews: number
  }
}

export default class GetDashboardStatsQuery extends BaseQuery<
  Record<string, never>,
  GetDashboardStatsResult
> {
  constructor(
    execCtx: ExecutionContext,
    private userRepo = new AdminUserRepository(),
    private orgRepo = new AdminOrganizationRepository(),
    private projectRepo = new AdminProjectRepository(),
    private taskRepo = new AdminTaskRepository(),
    private subscriptionRepo = new AdminSubscriptionRepository(),
    private flaggedReviewRepo = new AdminFlaggedReviewRepository()
  ) {
    super(execCtx)
  }

  async handle(_dto?: Record<string, never>): Promise<GetDashboardStatsResult> {
    // Fetch stats from repositories (Infrastructure layer)
    const [userStats, orgStats, projectStats, taskStats, subscriptionStats, pendingFlaggedReviews] =
      await Promise.all([
        this.userRepo.getUserStats(),
        this.orgRepo.getOrganizationStats(),
        this.projectRepo.getProjectStats(),
        this.taskRepo.getTaskStats(),
        this.subscriptionRepo.getSubscriptionStats(),
        this.flaggedReviewRepo.countPending(),
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
      subscriptions: {
        total: subscriptionStats.total,
        active: subscriptionStats.active,
        expiring_soon: subscriptionStats.expiringSoon,
        pro: subscriptionStats.byPlan.pro ?? 0,
        promax: subscriptionStats.byPlan.enterprise ?? 0,
      },
      moderation: {
        pending_flagged_reviews: pendingFlaggedReviews,
      },
    }
  }
}
