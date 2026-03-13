import Task from '#models/task'
import UserRepository from '#repositories/user_repository'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import type { ExecutionContext } from '#types/execution_context'
import redis from '@adonisjs/redis/services/main'
import { DateTime } from 'luxon'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { TaskStatus } from '#constants/task_constants'
import { SystemRoleName } from '#constants/user_constants'
import { OrganizationRole } from '#constants/organization_constants'

// Type alias for Task query builder
type TaskQueryBuilder = ReturnType<typeof Task.query>

// Interface for group count rows
interface GroupCountRow {
  status?: string
  priority?: string
  label?: string
  $extras: { count: number | string; total?: number | string }
}

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

    // Check if user is superadmin → delegate to Model
    const isSuperAdmin = await UserRepository.isSystemAdmin(userId)
    const roleName = isSuperAdmin ? 'admin' : null

    // Build base query with permissions
    const baseQuery = Task.query().where('organization_id', organizationId).whereNull('deleted_at')

    await this.applyPermissionFilters(baseQuery, userId, roleName, organizationId)

    // Execute all statistics queries in parallel
    const [
      total,
      byStatus,
      byPriority,
      byLabel,
      overdue,
      completedThisWeek,
      completedThisMonth,
      avgCompletionDays,
      timeTracking,
    ] = await Promise.all([
      this.getTotalCount(baseQuery),
      this.getCountByStatus(baseQuery),
      this.getCountByPriority(baseQuery),
      this.getCountByLabel(baseQuery),
      this.getOverdueCount(baseQuery),
      this.getCompletedThisWeek(baseQuery),
      this.getCompletedThisMonth(baseQuery),
      this.getAvgCompletionDays(baseQuery),
      this.getTimeTrackingStats(baseQuery),
    ])

    const result = {
      total,
      byStatus,
      byPriority,
      byLabel,
      overdue,
      completedThisWeek,
      completedThisMonth,
      avgCompletionDays,
      timeTracking,
    }

    // Cache result
    await this.saveToCache(cacheKey, result, 300) // 5 minutes

    return result
  }

  /**
   * Apply permission filters → delegate to Model
   */
  private async applyPermissionFilters(
    query: ReturnType<typeof Task.query>,
    userId: DatabaseId,
    roleName: string | undefined | null,
    organizationId: DatabaseId
  ): Promise<void> {
    const isSuperAdmin = [SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN].includes(
      (roleName?.toLowerCase() || '') as SystemRoleName
    )

    if (isSuperAdmin) {
      return
    }

    // Check organization role → delegate to Model
    const orgRole = await OrganizationUserRepository.getMemberRoleName(organizationId, userId, undefined, false)

    if (!orgRole) {
      void query.where('id', -1) // No results
      return
    }

    // Org Owner/Admin sees all
    if (
      [OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(String(orgRole) as OrganizationRole)
    ) {
      return
    }

    // Member: Only own tasks
    void query.where((memberQuery) => {
      void memberQuery.where('creator_id', userId).orWhere('assigned_to', userId)
    })
  }

  private async getTotalCount(baseQuery: ReturnType<typeof Task.query>): Promise<number> {
    const result = await baseQuery.clone().count('* as total').first()
    if (!result) return 0
    const typedResult = result as unknown as GroupCountRow
    return Number(typedResult.$extras.total ?? 0)
  }

  private async getCountByStatus(baseQuery: TaskQueryBuilder): Promise<Record<string, number>> {
    const results = await baseQuery.clone().select('status').count('* as count').groupBy('status')

    const stats: Record<string, number> = {}
    ;(results as unknown as GroupCountRow[]).forEach((row) => {
      stats[String(row.status)] = Number(row.$extras.count)
    })
    return stats
  }

  private async getCountByPriority(baseQuery: TaskQueryBuilder): Promise<Record<string, number>> {
    const results = await baseQuery
      .clone()
      .select('priority')
      .count('* as count')
      .whereNotNull('priority')
      .groupBy('priority')

    const stats: Record<string, number> = {}
    ;(results as unknown as GroupCountRow[]).forEach((row) => {
      stats[String(row.priority)] = Number(row.$extras.count)
    })
    return stats
  }

  private async getCountByLabel(baseQuery: TaskQueryBuilder): Promise<Record<string, number>> {
    const results = await baseQuery
      .clone()
      .select('label')
      .count('* as count')
      .whereNotNull('label')
      .groupBy('label')

    const stats: Record<string, number> = {}
    ;(results as unknown as GroupCountRow[]).forEach((row) => {
      stats[String(row.label)] = Number(row.$extras.count)
    })
    return stats
  }

  private async getOverdueCount(baseQuery: TaskQueryBuilder): Promise<number> {
    const result = await baseQuery
      .clone()
      .whereNotNull('due_date')
      .where('due_date', '<', DateTime.now().toFormat('yyyy-MM-dd'))
      .whereNotIn('status', [TaskStatus.DONE, TaskStatus.CANCELLED]) // Not done or cancelled
      .count('* as total')
      .first()

    const typedResult = result as GroupCountRow | null
    return Number(typedResult?.$extras.total ?? 0)
  }

  private async getCompletedThisWeek(baseQuery: TaskQueryBuilder): Promise<number> {
    const startOfWeek = DateTime.now().startOf('week')

    const result = await baseQuery
      .clone()
      .where('status', TaskStatus.DONE)
      .where('updated_at', '>=', startOfWeek.toSQL())
      .count('* as total')
      .first()

    const typedResult = result as GroupCountRow | null
    return Number(typedResult?.$extras.total ?? 0)
  }

  private async getCompletedThisMonth(baseQuery: TaskQueryBuilder): Promise<number> {
    const startOfMonth = DateTime.now().startOf('month')

    const result = await baseQuery
      .clone()
      .where('status', TaskStatus.DONE)
      .where('updated_at', '>=', startOfMonth.toSQL())
      .count('* as total')
      .first()

    const typedResult = result as GroupCountRow | null
    return Number(typedResult?.$extras.total ?? 0)
  }

  private async getAvgCompletionDays(baseQuery: TaskQueryBuilder): Promise<number | null> {
    const completedTasks = (await baseQuery
      .clone()
      .where('status', TaskStatus.DONE)
      .select('created_at', 'updated_at')) as Task[]

    if (completedTasks.length === 0) {
      return null
    }

    const totalDays = completedTasks.reduce((sum: number, task: Task) => {
      const created = DateTime.fromJSDate(task.created_at.toJSDate())
      const completed = DateTime.fromJSDate(task.updated_at.toJSDate())
      return sum + completed.diff(created, 'days').days
    }, 0)

    return Math.round(totalDays / completedTasks.length)
  }

  private async getTimeTrackingStats(baseQuery: TaskQueryBuilder): Promise<{
    tasksWithEstimate: number
    tasksWithActual: number
    totalEstimated: number
    totalActual: number
    avgEstimated: number
    avgActual: number
    efficiency: number | null
  }> {
    const tasks = (await baseQuery.clone().select('estimated_time', 'actual_time')) as Task[]

    const tasksWithEstimate = tasks.filter((t: Task) => t.estimated_time).length
    const tasksWithActual = tasks.filter((t: Task) => t.actual_time).length

    const totalEstimated = tasks.reduce((sum: number, t: Task) => sum + (t.estimated_time || 0), 0)
    const totalActual = tasks.reduce((sum: number, t: Task) => sum + (t.actual_time || 0), 0)

    const avgEstimated = tasksWithEstimate > 0 ? totalEstimated / tasksWithEstimate : 0
    const avgActual = tasksWithActual > 0 ? totalActual / tasksWithActual : 0

    const efficiency = totalEstimated > 0 ? totalActual / totalEstimated : null

    return {
      tasksWithEstimate,
      tasksWithActual,
      totalEstimated: Math.round(totalEstimated * 10) / 10,
      totalActual: Math.round(totalActual * 10) / 10,
      avgEstimated: Math.round(avgEstimated * 10) / 10,
      avgActual: Math.round(avgActual * 10) / 10,
      efficiency: efficiency ? Math.round(efficiency * 100) / 100 : null,
    }
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
