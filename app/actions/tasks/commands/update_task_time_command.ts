import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type UpdateTaskTimeDTO from '../dtos/request/update_task_time_dto.js'

import CreateAuditLog from '#actions/audit/create_audit_log'
import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { canUpdateTaskTime } from '#domain/tasks/task_permission_policy'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type Task from '#models/task'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

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
}
