import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type UpdateTaskTimeDTO from '../dtos/request/update_task_time_dto.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { taskCacheAdapter } from '#infra/cache/task_cache_adapter'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import { AuditAction, EntityType } from '#modules/audit/constants/audit_constants'
import { canUpdateTaskTime } from '#modules/tasks/domain/task_permission_policy'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskRecord, TaskDetailRecord } from '#types/task_records'

interface PersistedTaskTimeUpdate {
  task: TaskRecord
  oldValues: {
    estimated_time: number
    actual_time: number
  }
}

/**
 * Command để cập nhật thời gian của task
 *
 * Business Rules:
 * - Update estimated_time và/hoặc actual_time
 * - Set updated_by
 * - Audit log đầy đủ
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class UpdateTaskTimeCommand {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command để update time
   */
  async execute(dto: UpdateTaskTimeDTO): Promise<TaskDetailRecord> {
    const userId = this.requireUserId()
    const updateResult = await this.persistTaskTimeUpdateInTransaction(dto, userId)
    await this.runPostCommitEffects(updateResult, userId)
    return await TaskRepository.findByIdWithDetailRecord(dto.task_id)
  }

  private requireUserId(): DatabaseId {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async persistTaskTimeUpdateInTransaction(
    dto: UpdateTaskTimeDTO,
    userId: DatabaseId
  ): Promise<PersistedTaskTimeUpdate> {
    const trx = await db.transaction()

    try {
      const task = await TaskRepository.findActiveForUpdateAsRecord(dto.task_id, trx)
      await this.ensureTimeUpdatePermission(task, userId, trx)
      const updateResult = await this.persistTaskTimeUpdate(task, dto, userId, trx)
      await trx.commit()
      return updateResult
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async ensureTimeUpdatePermission(
    task: TaskRecord,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const permissionContext = await buildTaskPermissionContext(userId, task, trx)
    enforcePolicy(canUpdateTaskTime(permissionContext))
  }

  private async persistTaskTimeUpdate(
    task: TaskRecord,
    dto: UpdateTaskTimeDTO,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<PersistedTaskTimeUpdate> {
    const oldValues = {
      estimated_time: task.estimated_time ?? 0,
      actual_time: task.actual_time ?? 0,
    }

    const updatedTask = await TaskRepository.updateTask(
      task.id,
      {
        ...dto.toObject(),
        updated_by: userId,
      },
      trx
    )
    await this.recordTaskTimeUpdatedAudit(updatedTask, oldValues, userId)

    return {
      task: updatedTask,
      oldValues,
    }
  }

  private async recordTaskTimeUpdatedAudit(
    task: TaskRecord,
    oldValues: PersistedTaskTimeUpdate['oldValues'],
    userId: DatabaseId
  ): Promise<void> {
    await auditPublicApi.log(
      {
        user_id: userId,
        action: AuditAction.UPDATE_TIME,
        entity_type: EntityType.TASK,
        entity_id: task.id,
        old_values: oldValues,
        new_values: {
          estimated_time: task.estimated_time,
          actual_time: task.actual_time,
        },
      },
      this.execCtx
    )
  }

  private async runPostCommitEffects(
    updateResult: PersistedTaskTimeUpdate,
    userId: DatabaseId
  ): Promise<void> {
    await taskCacheAdapter.invalidateOnTaskUpdate(updateResult.task.id)

    void emitter.emit('task:updated', {
      taskId: updateResult.task.id,
      updatedBy: userId,
      changes: {
        estimated_time: updateResult.task.estimated_time,
        actual_time: updateResult.task.actual_time,
      },
      previousValues: updateResult.oldValues,
    })
  }
}
