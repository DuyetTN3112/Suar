
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { buildTaskPermissionFilter } from '#modules/tasks/actions/support/task_permission_filter_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskPermissionFilter } from '#modules/tasks/infra/repositories/read/shared'
import * as statisticsQueries from '#modules/tasks/infra/repositories/read/statistics_queries'


/**
 * Query để lấy statistics của tasks
 *
 * Returns:
 * - Total tasks
 * - Count by status
 * - Count by priority
 * - Count by label
 * - Overdue tasks count
 * - Completed this week/month
 * - Average completion time (days)
 * - Time tracking stats (estimated vs actual)
 *
 * Features:
 * - Permission-based filtering
 * - Redis caching (5 minutes)
 */
export default class GetTaskStatisticsQuery {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies
  ) {}

  /**
   * Execute query
   */
  async execute(organizationId: string): Promise<{
    total: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
    byLabel: Record<string, number>
    overdue: number
    completedThisWeek: number
    completedThisMonth: number
    avgCompletionDays: number | null
    timeTracking: {
      tasksWithEstimate: number
      tasksWithActual: number
      totalEstimated: number
      totalActual: number
      avgEstimated: number
      avgActual: number
      efficiency: number | null // actual/estimated ratio
    }
  }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Try cache first
    const cacheKey = `task:stats:org:${organizationId}:user:${userId}`
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached as ReturnType<typeof this.execute> extends Promise<infer R> ? R : never
    }

    // Determine permission filter
    const permissionFilter = await this.resolvePermissionFilter(userId, organizationId)

    // Execute all statistics queries via repository
    const result = await statisticsQueries.getStatisticsByOrganization(
      organizationId,
      permissionFilter
    )

    // Cache result
    await this.saveToCache(cacheKey, result, 300) // 5 minutes

    return result
  }

  /**
   * Resolve permission filter for the current user
   */
  private async resolvePermissionFilter(
    userId: string,
    organizationId: string
  ): Promise<TaskPermissionFilter> {
    const accessContext = await buildTaskCollectionAccessContext(
      userId,
      organizationId,
      'none',
      undefined,
      this.taskExternalDependencies.permission
    )
    return buildTaskPermissionFilter(accessContext)
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<unknown> {
    try {
      return await cacheStore.get<unknown>(key)
    } catch (error) {
      loggerService.error('[GetTaskStatisticsQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await cacheStore.set(key, data, ttl)
    } catch (error) {
      loggerService.error('[GetTaskStatisticsQuery] Cache set error:', error)
    }
  }
}
