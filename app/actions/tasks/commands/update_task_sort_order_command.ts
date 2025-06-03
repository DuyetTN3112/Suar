import Task from '#models/task'
import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import db from '@adonisjs/lucid/services/db'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ValidationException from '#exceptions/validation_exception'
import CacheService from '#services/cache_service'
import loggerService from '#services/logger_service'

/**
 * Command để cập nhật sort_order của task (drag & drop reorder)
 *
 * Used by: Kanban board drag-within-column, List view reorder
 */
export default class UpdateTaskSortOrderCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(taskId: DatabaseId, newSortOrder: number, newStatus?: string): Promise<Task> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    if (typeof newSortOrder !== 'number' || newSortOrder < 0) {
      throw new ValidationException('sort_order phải là số >= 0')
    }

    const trx = await db.transaction()

    try {
      const task = await Task.query({ client: trx })
        .where('id', taskId)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      task.useTransaction(trx)

      // Update sort order
      task.sort_order = newSortOrder

      // Optionally update status (when dragging between Kanban columns)
      if (newStatus) {
        task.status = newStatus
      }

      task.updated_by = userId

      await task.save()
      await trx.commit()

      // Invalidate caches
      await CacheService.invalidateEntityType('tasks')

      return task
    } catch (error) {
      await trx.rollback()
      loggerService.error('[UpdateTaskSortOrderCommand] Error:', error)
      throw error
    }
  }
}
