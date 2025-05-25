import Task from '#models/task'
import type { HttpContext } from '@adonisjs/core/http'
import redis from '@adonisjs/redis/services/main'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

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
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute query
   */
  async execute(organizationId: number): Promise<{
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
    const user = this.ctx.auth.user
    if (!user) {
      throw new Error('User chưa đăng nhập')
    }

    // Try cache first
    const cacheKey = `task:stats:org:${organizationId}:user:${user.id}`
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Load user role for permission filtering
    await user.load('role')

    // Build base query with permissions
    const baseQuery = Task.query().where('organization_id', organizationId).whereNull('deleted_at')

    await this.applyPermissionFilters(baseQuery, user, organizationId)

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
   * Apply permission filters
   */
  private async applyPermissionFilters(
    query: unknown,
    user: unknown,
    organizationId: number
  ): Promise<void> {
    const isSuperAdmin = ['superadmin', 'admin'].includes(user.role?.name?.toLowerCase() || '')

    if (isSuperAdmin) {
      return
    }

    // Check organization role
    const orgUser = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', user.id)
      .first()

    if (!orgUser) {
      query.where('id', -1) // No results
      return
    }

    // Org Owner/Manager sees all
    if ([1, 2].includes(orgUser.role_id)) {
      return
    }

    // Member: Only own tasks
    query.where((memberQuery: unknown) => {
      memberQuery.where('creator_id', user.id).orWhere('assigned_to', user.id)
    })
  }

  private async getTotalCount(baseQuery: unknown): Promise<number> {
    const result = await baseQuery.clone().count('* as total').first()
    return Number(result?.$extras.total || 0)
  }

  private async getCountByStatus(baseQuery: unknown): Promise<Record<string, number>> {
    const results = await baseQuery
      .clone()
      .select('status_id')
      .count('* as count')
      .groupBy('status_id')

    const stats: Record<string, number> = {}
    results.forEach((row: unknown) => {
      stats[row.status_id] = Number(row.$extras.count)
    })
    return stats
  }

  private async getCountByPriority(baseQuery: unknown): Promise<Record<string, number>> {
    const results = await baseQuery
      .clone()
      .select('priority_id')
      .count('* as count')
      .whereNotNull('priority_id')
      .groupBy('priority_id')

    const stats: Record<string, number> = {}
    results.forEach((row: unknown) => {
      stats[row.priority_id] = Number(row.$extras.count)
    })
    return stats
  }

  private async getCountByLabel(baseQuery: unknown): Promise<Record<string, number>> {
    const results = await baseQuery
      .clone()
      .select('label_id')
      .count('* as count')
      .whereNotNull('label_id')
      .groupBy('label_id')

    const stats: Record<string, number> = {}
    results.forEach((row: unknown) => {
      stats[row.label_id] = Number(row.$extras.count)
    })
    return stats
  }

  private async getOverdueCount(baseQuery: unknown): Promise<number> {
    const result = await baseQuery
      .clone()
      .whereNotNull('due_date')
      .where('due_date', '<', DateTime.now().toFormat('yyyy-MM-dd'))
      .whereNotIn('status_id', [3, 4]) // Not completed or cancelled
      .count('* as total')
      .first()

    return Number(result?.$extras.total || 0)
  }

  private async getCompletedThisWeek(baseQuery: unknown): Promise<number> {
    const startOfWeek = DateTime.now().startOf('week')

    const result = await baseQuery
      .clone()
      .where('status_id', 3) // Completed
      .where('updated_at', '>=', startOfWeek.toSQL())
      .count('* as total')
      .first()

    return Number(result?.$extras.total || 0)
  }

  private async getCompletedThisMonth(baseQuery: unknown): Promise<number> {
    const startOfMonth = DateTime.now().startOf('month')

    const result = await baseQuery
      .clone()
      .where('status_id', 3) // Completed
      .where('updated_at', '>=', startOfMonth.toSQL())
      .count('* as total')
      .first()

    return Number(result?.$extras.total || 0)
  }

  private async getAvgCompletionDays(baseQuery: unknown): Promise<number | null> {
    const completedTasks = await baseQuery
      .clone()
      .where('status_id', 3) // Completed
      .select('created_at', 'updated_at')

    if (completedTasks.length === 0) {
      return null
    }

    const totalDays = completedTasks.reduce((sum: number, task: unknown) => {
      const created = DateTime.fromJSDate(task.created_at.toJSDate())
      const completed = DateTime.fromJSDate(task.updated_at.toJSDate())
      return sum + completed.diff(created, 'days').days
    }, 0)

    return Math.round(totalDays / completedTasks.length)
  }

  private async getTimeTrackingStats(baseQuery: unknown): Promise<{
    tasksWithEstimate: number
    tasksWithActual: number
    totalEstimated: number
    totalActual: number
    avgEstimated: number
    avgActual: number
    efficiency: number | null
  }> {
    const tasks = await baseQuery.clone().select('estimated_time', 'actual_time')

    const tasksWithEstimate = tasks.filter((t: unknown) => t.estimated_time).length
    const tasksWithActual = tasks.filter((t: unknown) => t.actual_time).length

    const totalEstimated = tasks.reduce(
      (sum: number, t: unknown) => sum + (Number(t.estimated_time) || 0),
      0
    )
    const totalActual = tasks.reduce(
      (sum: number, t: unknown) => sum + (Number(t.actual_time) || 0),
      0
    )

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
      console.error('[GetTaskStatisticsQuery] Cache get error:', error)
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
      console.error('[GetTaskStatisticsQuery] Cache set error:', error)
    }
  }
}
