import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type UpdateTaskTimeDTO from '../dtos/request/update_task_time_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canUpdateTaskTime } from '#modules/tasks/domain/task_permission_policy'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord, TaskDetailRecord } from '#modules/tasks/types/task_records'

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
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private cache: TaskCachePort
  ) {}

  /**
   * Execute command để update time
   */
  async execute(dto: UpdateTaskTimeDTO): Promise<TaskDetailRecord> {
    const userId = this.requireUserId()
    const updateResult = await this.persistTaskTimeUpdateInTransaction(dto, userId)
    await this.runPostCommitEffects(updateResult, userId)
    return await detailQueries.findByIdWithDetailRecord(dto.task_id)
  }

  private requireUserId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async persistTaskTimeUpdateInTransaction(
    dto: UpdateTaskTimeDTO,
    userId: string
  ): Promise<PersistedTaskTimeUpdate> {
    const trx = await db.transaction()

    try {
      const task = await taskMutations.findActiveForUpdateAsRecord(dto.task_id, trx)
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
    userId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    const permissionContext = await buildTaskPermissionContext(
      userId,
      task,
      trx,
      this.taskExternalDependencies.permission
    )
    enforcePolicy(canUpdateTaskTime(permissionContext))
  }

  private async persistTaskTimeUpdate(
    task: TaskRecord,
    dto: UpdateTaskTimeDTO,
    userId: string,
    trx: TransactionClientContract
  ): Promise<PersistedTaskTimeUpdate> {
    const oldValues = {
      estimated_time: task.estimated_time ?? 0,
      actual_time: task.actual_time ?? 0,
    }

    const updatedTask = await taskMutations.updateTask(
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
    userId: string
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
    userId: string
  ): Promise<void> {
    await this.cache.invalidateAfterTaskUpdated(updateResult.task.id)

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
