
import type GetTaskDetailDTO from '../dtos/request/get_task_detail_dto.js'
import { mapTaskDetailOutput, type TaskQueryRecord } from '../mapper/task_query_output_mapper.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { calculateTaskPermissions, canViewTask } from '#modules/tasks/domain/task_permission_policy'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import type { TaskDetailRecord, TaskDetailRelation } from '#modules/tasks/types/task_records'

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
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies
  ) {}

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

    const task = await this.loadTask(dto.task_id, this.getOptionalRelations(dto))
    const permissions = await this.getPermissions(userId, task)
    const auditLogs = await this.getAuditLogs(dto, task.id)

    const result = this.buildResult(task, permissions, auditLogs)
    await this.saveToCache(cacheKey, result)
    return result
  }

  /**
   * Load audit logs
   */
  private async loadAuditLogs(taskId: string, limit: number): Promise<unknown[]> {
    const logs = await auditPublicApi.listByEntity('task', taskId, limit)
    const userMap = await auditPublicApi.buildUserMap(logs, ['id', 'username', 'email'])

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
        changes: auditPublicApi.formatChanges(log.old_values ?? {}, log.new_values ?? {}),
      }
    })
  }

  private ensureUserId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async loadTask(taskId: string, optionalRelations: TaskDetailRelation[]) {
    return await detailQueries.findByIdWithDetailRecord(taskId, undefined, optionalRelations)
  }

  private async getPermissions(userId: string, task: TaskDetailRecord): Promise<TaskDetailPermissions> {
    const permissionContext = await buildTaskPermissionContext(
      userId,
      task,
      undefined,
      this.taskExternalDependencies.permission
    )
    enforcePolicy(canViewTask(permissionContext))
    return calculateTaskPermissions(permissionContext)
  }

  private getOptionalRelations(dto: GetTaskDetailDTO): TaskDetailRelation[] {
    const relations: TaskDetailRelation[] = []

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
    taskId: string
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
      const cached = await cacheStore.get<TaskDetailResult>(key)
      if (cached) {
        return cached
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
      await cacheStore.set(key, data, 300)
    } catch (error) {
      loggerService.error('[GetTaskDetailQuery] Cache set error:', error)
    }
  }
}
