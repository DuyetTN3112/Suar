import UserRepository from '#infra/users/repositories/user_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import RepositoryFactory from '#infra/shared/repositories/repository_factory'
import type GetTaskDetailDTO from '../dtos/request/get_task_detail_dto.js'
import type { ExecutionContext } from '#types/execution_context'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { calculateTaskPermissions, canViewTask } from '#domain/tasks/task_permission_policy'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import { mapTaskDetailOutput, type TaskQueryRecord } from '../mapper/task_query_output_mapper.js'

/**
 * Query để lấy chi tiết một task
 *
 * Features:
 * - Load full task với all relations
 * - Optional: versions, childTasks, auditLogs
 * - Permission check (Admin hoặc Assignee)
 * - Redis caching (5 minutes)
 * - Permissions object (isCreator, canEdit, canDelete, etc.)
 *
 * Permissions:
 * - Admin/Superadmin: Xem tất cả
 * - Assignee: Xem task được assign
 * - Creator: Xem task đã tạo
 * - Org Owner/Manager: Xem tasks trong org
 */
export default class GetTaskDetailQuery {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute query
   */
  async execute(dto: GetTaskDetailDTO): Promise<{
    task: TaskQueryRecord
    permissions: {
      isCreator: boolean
      isAssignee: boolean
      canEdit: boolean
      canDelete: boolean
      canAssign: boolean
    }
    auditLogs?: unknown[]
  }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Try cache first (if not minimal load)
    if (!dto.isMinimalLoad()) {
      const cacheKey = dto.getCacheKey()
      const cached = await this.getFromCache(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Load task với basic relations (v3: status/label/priority are inline columns)
    const task = await TaskRepository.findByIdWithDetailRelations(dto.task_id)

    const permissionContext = await buildTaskPermissionContext(userId, task)
    enforcePolicy(canViewTask(permissionContext))

    // Load optional relations (batch load)
    const optionalLoads: Array<'childTasks' | 'versions'> = []
    if (dto.shouldLoadChildTasks()) optionalLoads.push('childTasks')
    if (dto.shouldLoadVersions()) optionalLoads.push('versions')

    if (optionalLoads.length > 0) {
      await task.load((loader) => {
        for (const rel of optionalLoads) {
          loader.load(rel)
        }
      })
    }

    // Calculate permissions (reuse fetched role data)
    const permissions = calculateTaskPermissions(permissionContext)

    // Load audit logs if requested
    let auditLogs: unknown[] | undefined
    if (dto.shouldLoadAuditLogs()) {
      auditLogs = await this.loadAuditLogs(task.id, dto.audit_logs_limit)
    }

    const result = {
      task: mapTaskDetailOutput(task),
      permissions,
      auditLogs,
    }

    // Cache result (if not minimal)
    if (!dto.isMinimalLoad()) {
      const cacheKey = dto.getCacheKey()
      await this.saveToCache(cacheKey, result, 300) // 5 minutes
    }

    return result
  }

  /**
   * Load audit logs
   */
  private async loadAuditLogs(taskId: DatabaseId, limit: number): Promise<unknown[]> {
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

    return logs.map((log) => {
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
  }

  /**
   * Format changes for audit log
   */
  private formatChanges(
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>
  ): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = []

    for (const key in newValues) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes.push({
          field: key,
          oldValue: oldValues[key],
          newValue: newValues[key],
        })
      }
    }

    return changes
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<{
    task: TaskQueryRecord
    permissions: {
      isCreator: boolean
      isAssignee: boolean
      canEdit: boolean
      canDelete: boolean
      canAssign: boolean
    }
    auditLogs?: unknown[]
  } | null> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        const parsed = JSON.parse(cached) as {
          task: TaskQueryRecord
          permissions: {
            isCreator: boolean
            isAssignee: boolean
            canEdit: boolean
            canDelete: boolean
            canAssign: boolean
          }
          auditLogs?: unknown[]
        }
        return parsed
      }
    } catch (error) {
      loggerService.error('[GetTaskDetailQuery] Cache get error:', error)
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
      loggerService.error('[GetTaskDetailQuery] Cache set error:', error)
    }
  }
}
