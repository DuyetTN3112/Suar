import AuditLog from '#models/audit_log'
import type { HttpContext } from '@adonisjs/core/http'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'

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
    taskId: DatabaseId,
    limit: number = 20
  ): Promise<
    Array<{
      id: DatabaseId
      action: string
      user: { id: DatabaseId; name: string; email: string } | null
      timestamp: Date
      changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>
    }>
  > {
    // Validate limit
    if (limit < 1 || limit > 100) {
      throw new ValidationException('Limit phải từ 1 đến 100')
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
      .preload('user', (userQuery) => {
        void userQuery.select(['id', 'username', 'email'])
      })

    // Format logs
    const formattedLogs = logs.map((log) => {
      return {
        id: log.id,
        action: log.action,
        user: {
          id: log.user.id,
          name: log.user.username || 'Unknown',
          email: log.user.email ?? '',
        },
        timestamp: log.created_at.toJSDate(),
        changes: this.formatChanges(
          (log.old_values || {}) as Record<string, unknown>,
          (log.new_values || {}) as Record<string, unknown>
        ),
      }
    })

    // Cache result
    await this.saveToCache(cacheKey, formattedLogs, 120) // 2 minutes

    return formattedLogs
  }

  /**
   * Format changes from old/new values
   */
  private formatChanges(
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>
  ): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = []

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
  private async getFromCache(key: string): Promise<Array<{
    id: DatabaseId
    action: string
    user: { id: DatabaseId; name: string; email: string } | null
    timestamp: Date
    changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>
  }> | null> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        const parsed: unknown = JSON.parse(cached)
        if (Array.isArray(parsed)) {
          return parsed as Array<{
            id: DatabaseId
            action: string
            user: { id: DatabaseId; name: string; email: string } | null
            timestamp: Date
            changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>
          }>
        }
      }
    } catch (error) {
      loggerService.error('[GetTaskAuditLogsQuery] Cache get error:', error)
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
      loggerService.error('[GetTaskAuditLogsQuery] Cache set error:', error)
    }
  }
}
