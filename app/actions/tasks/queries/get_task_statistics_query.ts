import UserRepository from '#repositories/user_repository'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import TaskRepository from '#repositories/task_repository'
import type { TaskPermissionFilter } from '#repositories/task_repository'
import type { ExecutionContext } from '#types/execution_context'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { OrganizationRole } from '#constants/organization_constants'

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
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute query
   */
  async execute(organizationId: DatabaseId): Promise<{
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
    const result = await TaskRepository.getStatisticsByOrganization(
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
    userId: DatabaseId,
    organizationId: DatabaseId
  ): Promise<TaskPermissionFilter> {
    const isSuperAdmin = await UserRepository.isSystemAdmin(userId)
    if (isSuperAdmin) return { type: 'all' }

    const orgRole = await OrganizationUserRepository.getMemberRoleName(
      organizationId,
      userId,
      undefined,
      false
    )

    if (!orgRole) {
      return { type: 'none' }
    }

    if (
      [OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(String(orgRole) as OrganizationRole)
    ) {
      return { type: 'all' }
    }

    return { type: 'own_or_assigned', userId }
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<unknown> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached)
      }
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
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      loggerService.error('[GetTaskStatisticsQuery] Cache set error:', error)
    }
  }
}
