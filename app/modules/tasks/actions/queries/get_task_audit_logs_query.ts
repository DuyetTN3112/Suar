
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import ValidationException from '#modules/http/exceptions/validation_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { TASK_PAGINATION as PAGINATION } from '#modules/tasks/application/dtos/common/task_pagination'

export interface GetTaskAuditLogsInput {
  taskId: string
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
      id: string
      action: string
      user: { id: string; name: string; email: string } | null
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
        id: string
        action: string
        user: { id: string; name: string; email: string } | null
        timestamp: Date
        changes: { field: string; oldValue: unknown; newValue: unknown }[]
      }[]
    | null
  > {
    try {
      const cached = await cacheStore.get<unknown>(key)
      if (Array.isArray(cached)) {
        return cached as {
            id: string
            action: string
            user: { id: string; name: string; email: string } | null
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
      await cacheStore.set(key, data, ttl)
    } catch (error) {
      loggerService.error('[GetTaskAuditLogsQuery] Cache set error:', error)
    }
  }
}
