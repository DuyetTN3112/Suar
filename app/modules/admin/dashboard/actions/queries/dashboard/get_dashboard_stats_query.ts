import type { AdminActionContext } from '#modules/admin/dashboard/actions/action_context'
import type {
  AdminOrganizationRepository,
  AdminProjectStatsRepository,
  AdminSubscriptionRepository,
  AdminTaskStatsRepository,
} from '#modules/admin/dashboard/actions/ports/outbound/dashboard/admin_operational_repository'
import type { AdminUserDirectory } from '#modules/admin/dashboard/actions/ports/outbound/dashboard/admin_user_administration'
import type { ReviewModerationGateway } from '#modules/admin/dashboard/actions/ports/outbound/dashboard/review_moderation_gateway'
import { BaseQuery } from '#modules/admin/dashboard/actions/queries/dashboard/base_query'

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
    execCtx: AdminActionContext,
    private readonly userDirectory: AdminUserDirectory,
    private moderationGateway: ReviewModerationGateway,
    private readonly orgRepo: AdminOrganizationRepository,
    private readonly projectRepo: AdminProjectStatsRepository,
    private readonly taskRepo: AdminTaskStatsRepository,
    private readonly subscriptionRepo: AdminSubscriptionRepository
  ) {
    super(execCtx)
  }

  async handle(_dto?: Record<string, never>): Promise<GetDashboardStatsResult> {
    // Fetch stats from repositories (Infrastructure layer)
    const [userStats, orgStats, projectStats, taskStats, subscriptionStats, pendingFlaggedReviews] =
      await Promise.all([
        this.userDirectory.getUserStats(),
        this.orgRepo.getOrganizationStats(),
        this.projectRepo.getProjectStats(),
        this.taskRepo.getTaskStats(),
        this.subscriptionRepo.getSubscriptionStats(),
        this.moderationGateway.countPending(),
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
        pro: subscriptionStats.byPlan['pro'] ?? 0,
        promax: subscriptionStats.byPlan['enterprise'] ?? 0,
      },
      moderation: {
        pending_flagged_reviews: pendingFlaggedReviews,
      },
    }
  }
}
