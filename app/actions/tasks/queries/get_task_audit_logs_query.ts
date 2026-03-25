import RepositoryFactory from '#infra/shared/repositories/repository_factory'
import UserRepository from '#infra/users/repositories/user_repository'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'
import { PAGINATION } from '#constants/common_constants'

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
    if (limit < 1 || limit > PAGINATION.MAX_PER_PAGE) {
      throw new ValidationException('Limit phải từ 1 đến 100')
    }

    // Try cache first
    const cacheKey = `task:audit:${taskId}:limit:${limit}`
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Load audit logs via RepositoryFactory
    const auditRepo = await RepositoryFactory.getAuditLogRepository()
    const { data: logs } = await auditRepo.findMany({
      entity_type: 'task',
      entity_id: taskId,
      limit,
    })

    // Load users from PostgreSQL
    const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[]
    const users = await UserRepository.findByIds(userIds, ['id', 'username', 'email'])
    const userMap = new Map(users.map((u) => [u.id, u]))

    // Format logs
    const formattedLogs = logs.map((log) => {
      const user = userMap.get(log.user_id ?? '')
      return {
        id: log.id,
        action: log.action,
        user: user
          ? {
              id: user.id,
              name: user.username || 'Unknown',
              email: user.email ?? '',
            }
          : null,
        timestamp: log.created_at,
        changes: this.formatChanges(log.old_values ?? {}, log.new_values ?? {}),
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
