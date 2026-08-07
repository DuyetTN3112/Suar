import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import { TASK_PAGINATION as PAGINATION } from '#modules/tasks/actions/dtos/common/task_pagination'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { buildTaskPermissionContext } from '#modules/tasks/actions/task_permission_context'
import { canViewTaskAuditLogs } from '#modules/tasks/domain/task-assignment/task_permission_policy'

export interface GetTaskAuditLogsInput {
  taskId: string
  limit?: number
}

export interface TaskAuditLog {
  id: string
  action: string
  user: { id: string; name: string; email: string } | null
  timestamp: Date
  changes: { field: string; oldValue: unknown; newValue: unknown }[]
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
export default class GetTaskAuditLogsQuery extends BaseQuery<GetTaskAuditLogsInput, TaskAuditLog[]> {
  constructor(
    protected override execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies
  ) {
    super(execCtx)
  }

  async handle(input: GetTaskAuditLogsInput): Promise<TaskAuditLog[]> {
    return this.execute(input)
  }

  /**
   * Execute query
   */
  async execute(input: GetTaskAuditLogsInput): Promise<TaskAuditLog[]> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const limit = input.limit ?? 20

    // Validate limit
    if (limit < 1 || limit > PAGINATION.MAX_PER_PAGE) {
      throw new ValidationException('Limit phải từ 1 đến 100')
    }

    // Authorization must run before every cache lookup. A cache hit is not an
    // authorization decision and must not bypass current role/membership state.
    const task = await this.taskExternalDependencies.lifecycle.findTaskDetail(input.taskId)
    const permissionContext = await buildTaskPermissionContext(
      userId,
      task,
      undefined,
      this.taskExternalDependencies.permission
      , this.taskExternalDependencies.activeAssignmentReader
    )
    enforcePolicy(canViewTaskAuditLogs(permissionContext))

    // Viewer scope is defense-in-depth against accidental future reordering of
    // the permission check and prevents cross-actor cache poisoning.
    const logicalCacheKey = `task:audit:${input.taskId}:viewer:${userId}:limit:${limit}`
    const cacheKey = await cacheStore.resolveVersionedKeyBestEffort(
      entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit,
        'task',
        input.taskId
      ),
      logicalCacheKey
    )
    const cached = cacheKey ? await this.getFromCache(cacheKey) : null
    if (cached) {
      return cached
    }

    const formattedLogs = await this.taskExternalDependencies.audit.listTaskAuditTrail(
      input.taskId,
      limit
    )

    // Cache result
    if (cacheKey) {
      await this.saveToCache(cacheKey, formattedLogs, 120) // 2 minutes
    }

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
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: unknown, ttl: number): Promise<void> {
    await cacheStore.setBestEffort(key, data, ttl)
  }
}
