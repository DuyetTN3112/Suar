import AuditLog from '#models/audit_log'
import type { HttpContext } from '@adonisjs/core/http'
import redis from '@adonisjs/redis/services/main'

/**
 * Query để lấy audit logs của task
 *
 * Features:
 * - Load audit logs với user info
 * - Format changes (old/new values)
 * - Pagination (limit)
 * - Redis caching (2 minutes)
 *
 * Returns formatted audit logs:
 * - id, action, user, timestamp
 * - changes: [{ field, oldValue, newValue }]
 */
export default class GetTaskAuditLogsQuery {
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute query
   */
  async execute(
    taskId: number,
    limit: number = 20
  ): Promise<
    Array<{
      id: number
      action: string
      user: { id: number; name: string; email: string } | null
      timestamp: Date
      changes: Array<{ field: string; oldValue: any; newValue: any }>
    }>
  > {
    // Validate limit
    if (limit < 1 || limit > 100) {
      throw new Error('Limit phải từ 1 đến 100')
    }

    // Try cache first
    const cacheKey = `task:audit:${taskId}:limit:${limit}`
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Load audit logs
    const logs = await AuditLog.query()
      .where('entity_type', 'task')
      .where('entity_id', taskId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .preload('user', (userQuery: any) => {
        userQuery.select(['id', 'username', 'email'])
      })

    // Format logs
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.username || 'Unknown',
            email: log.user.email,
          }
        : null,
      timestamp: log.created_at.toJSDate(),
      changes: this.formatChanges(log.old_values || {}, log.new_values || {}),
    }))

    // Cache result
    await this.saveToCache(cacheKey, formattedLogs, 120) // 2 minutes

    return formattedLogs
  }

  /**
   * Format changes from old/new values
   */
  private formatChanges(
    oldValues: Record<string, any>,
    newValues: Record<string, any>
  ): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = []

    // Compare all fields in newValues
    for (const key in newValues) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes.push({
          field: key,
          oldValue: oldValues[key] ?? null,
          newValue: newValues[key] ?? null,
        })
      }
    }

    return changes
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<any> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.error('[GetTaskAuditLogsQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: any, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('[GetTaskAuditLogsQuery] Cache set error:', error)
    }
  }
}
