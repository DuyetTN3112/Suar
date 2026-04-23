import redis from '@adonisjs/redis/services/main'

import type GetTaskDetailDTO from '../dtos/request/get_task_detail_dto.js'
import { mapTaskDetailOutput, type TaskQueryRecord } from '../mapper/task_query_output_mapper.js'

import {
  buildAuditUserMap,
  formatAuditChanges,
  listAuditLogsByEntity,
} from '#actions/audit/read_audit_logs'
import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import { calculateTaskPermissions, canViewTask } from '#domain/tasks/task_permission_policy'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import loggerService from '#infra/logger/logger_service'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'




interface TaskDetailPermissions {
  isCreator: boolean
  isAssignee: boolean
  canEdit: boolean
  canDelete: boolean
  canAssign: boolean
}

export interface TaskDetailResult {
  task: TaskQueryRecord
  permissions: TaskDetailPermissions
  auditLogs?: unknown[]
}

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
  async execute(dto: GetTaskDetailDTO): Promise<TaskDetailResult> {
    const userId = this.ensureUserId()
    const cacheKey = dto.isMinimalLoad() ? null : dto.getCacheKey()
    const cachedResult = await this.getFromCache(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    const task = await this.loadTask(dto.task_id)
    const permissions = await this.getPermissions(userId, task)

    await this.loadOptionalRelations(task, dto)
    const auditLogs = await this.getAuditLogs(dto, task.id)

    const result = this.buildResult(task, permissions, auditLogs)
    await this.saveToCache(cacheKey, result)
    return result
  }

  /**
   * Load audit logs
   */
  private async loadAuditLogs(taskId: DatabaseId, limit: number): Promise<unknown[]> {
    const logs = await listAuditLogsByEntity('task', taskId, limit)
    const userMap = await buildAuditUserMap(logs, ['id', 'username', 'email'])

    return logs.map((log) => {
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
        changes: formatAuditChanges(log.old_values ?? {}, log.new_values ?? {}),
      }
    })
  }

  private ensureUserId(): DatabaseId {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async loadTask(taskId: DatabaseId) {
    return await TaskRepository.findByIdWithDetailRelations(taskId)
  }

  private async getPermissions(
    userId: DatabaseId,
    task: Awaited<ReturnType<typeof TaskRepository.findByIdWithDetailRelations>>
  ): Promise<TaskDetailPermissions> {
    const permissionContext = await buildTaskPermissionContext(userId, task)
    enforcePolicy(canViewTask(permissionContext))
    return calculateTaskPermissions(permissionContext)
  }

  private async loadOptionalRelations(
    task: Awaited<ReturnType<typeof TaskRepository.findByIdWithDetailRelations>>,
    dto: GetTaskDetailDTO
  ): Promise<void> {
    const relations = this.getOptionalRelations(dto)
    if (relations.length === 0) {
      return
    }

    await task.load((loader) => {
      for (const relation of relations) {
        loader.load(relation)
      }
    })
  }

  private getOptionalRelations(dto: GetTaskDetailDTO): ('childTasks' | 'versions')[] {
    const relations: ('childTasks' | 'versions')[] = []

    if (dto.shouldLoadChildTasks()) {
      relations.push('childTasks')
    }

    if (dto.shouldLoadVersions()) {
      relations.push('versions')
    }

    return relations
  }

  private async getAuditLogs(
    dto: GetTaskDetailDTO,
    taskId: DatabaseId
  ): Promise<unknown[] | undefined> {
    if (!dto.shouldLoadAuditLogs()) {
      return undefined
    }

    return await this.loadAuditLogs(taskId, dto.audit_logs_limit)
  }

  private buildResult(
    task: unknown,
    permissions: TaskDetailPermissions,
    auditLogs?: unknown[]
  ): TaskDetailResult {
    return {
      task: mapTaskDetailOutput(task),
      permissions,
      auditLogs,
    }
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string | null): Promise<TaskDetailResult | null> {
    if (!key) {
      return null
    }

    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached) as TaskDetailResult
      }
    } catch (error) {
      loggerService.error('[GetTaskDetailQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string | null, data: TaskDetailResult): Promise<void> {
    if (!key) {
      return
    }

    try {
      await redis.setex(key, 300, JSON.stringify(data))
    } catch (error) {
      loggerService.error('[GetTaskDetailQuery] Cache set error:', error)
    }
  }
}
