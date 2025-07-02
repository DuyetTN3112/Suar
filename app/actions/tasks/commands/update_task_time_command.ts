import type Task from '#models/task'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import CreateAuditLog from '#actions/common/create_audit_log'
import type UpdateTaskTimeDTO from '../dtos/request/update_task_time_dto.js'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { DatabaseId } from '#types/database'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canUpdateTaskTime } from '#domain/tasks/task_permission_policy'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'

interface PersistedTaskTimeUpdate {
  task: Task
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
  async execute(dto: UpdateTaskTimeDTO): Promise<Task> {
    const userId = this.requireUserId()
    const updateResult = await this.persistTaskTimeUpdateInTransaction(dto, userId)
    await this.runPostCommitEffects(updateResult, userId)
    return await TaskRepository.findByIdWithWriteRelations(dto.task_id)
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
      const task = await TaskRepository.findActiveForUpdate(dto.task_id, trx)
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
    task: Task,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const permissionContext = await buildTaskPermissionContext(userId, task, trx)
    enforcePolicy(canUpdateTaskTime(permissionContext))
  }

  private async persistTaskTimeUpdate(
    task: Task,
    dto: UpdateTaskTimeDTO,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<PersistedTaskTimeUpdate> {
    const oldValues = {
      estimated_time: task.estimated_time,
      actual_time: task.actual_time,
    }

    task.merge(dto.toObject())
    task.updated_by = userId
    await TaskRepository.save(task, trx)
    await this.recordTaskTimeUpdatedAudit(task, oldValues, userId)

    return {
      task,
      oldValues,
    }
  }

  private async recordTaskTimeUpdatedAudit(
    task: Task,
    oldValues: PersistedTaskTimeUpdate['oldValues'],
    userId: DatabaseId
  ): Promise<void> {
    await new CreateAuditLog(this.execCtx).handle({
      user_id: userId,
      action: AuditAction.UPDATE_TIME,
      entity_type: EntityType.TASK,
      entity_id: task.id,
      old_values: oldValues,
      new_values: {
        estimated_time: task.estimated_time,
        actual_time: task.actual_time,
      },
    })
  }

  private async runPostCommitEffects(
    updateResult: PersistedTaskTimeUpdate,
    userId: DatabaseId
  ): Promise<void> {
    await CacheService.deleteByPattern(`task:${updateResult.task.id}:*`)

    void emitter.emit('task:updated', {
      task: updateResult.task,
      updatedBy: userId,
      changes: {
        estimated_time: updateResult.task.estimated_time,
        actual_time: updateResult.task.actual_time,
      },
      previousValues: updateResult.oldValues,
    })
  }
}
