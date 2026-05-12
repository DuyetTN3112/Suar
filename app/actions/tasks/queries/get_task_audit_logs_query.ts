
import { auditPublicApi } from '#actions/audit/public_api'
import { PAGINATION } from '#constants/common_constants'
import ValidationException from '#exceptions/validation_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import type { DatabaseId } from '#types/database'

export interface GetTaskAuditLogsInput {
  taskId: DatabaseId
  limit?: number
}

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
  async execute(input: GetTaskAuditLogsInput): Promise<
    {
      id: DatabaseId
      action: string
      user: { id: DatabaseId; name: string; email: string } | null
      timestamp: Date
      changes: { field: string; oldValue: unknown; newValue: unknown }[]
    }[]
  > {
    const limit = input.limit ?? 20

    // Validate limit
    if (limit < 1 || limit > PAGINATION.MAX_PER_PAGE) {
      throw new ValidationException('Limit phải từ 1 đến 100')
    }

    // Try cache first
    const cacheKey = `task:audit:${input.taskId}:limit:${limit}`
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    const logs = await auditPublicApi.listByEntity('task', input.taskId, limit)
    const userMap = await auditPublicApi.buildUserMap(logs, ['id', 'username', 'email'])

    // Format logs
    const formattedLogs = logs.map((log) => {
      const user = userMap.get(log.user_id ?? '')
      return {
        id: log.id,
        action: log.action,
        user: user
          ? {
              id: user.id,
              name: user.username ?? 'Unknown',
              email: user.email ?? '',
            }
          : null,
        timestamp: log.created_at,
        changes: auditPublicApi.formatChanges(log.old_values ?? {}, log.new_values ?? {}),
      }
    })

    // Cache result
    await this.saveToCache(cacheKey, formattedLogs, 120) // 2 minutes

    return formattedLogs
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<
    | {
        id: DatabaseId
        action: string
        user: { id: DatabaseId; name: string; email: string } | null
        timestamp: Date
        changes: { field: string; oldValue: unknown; newValue: unknown }[]
      }[]
    | null
  > {
    try {
      const cached = await CacheService.get<unknown>(key)
      if (Array.isArray(cached)) {
        return cached as {
            id: DatabaseId
            action: string
            user: { id: DatabaseId; name: string; email: string } | null
            timestamp: Date
            changes: { field: string; oldValue: unknown; newValue: unknown }[]
        }[]
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
      await CacheService.set(key, data, ttl)
    } catch (error) {
      loggerService.error('[GetTaskAuditLogsQuery] Cache set error:', error)
    }
  }
}
