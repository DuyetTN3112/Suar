import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { buildTaskCollectionAccessContext } from '#actions/tasks/support/task_permission_context_builder'
import { TaskStatusCategory } from '#constants/task_constants'
import { canReorderTask } from '#domain/tasks/task_permission_policy'
import BusinessLogicException from '#exceptions/business_logic_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ValidationException from '#exceptions/validation_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import type Task from '#models/task'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

/**
 * Command để cập nhật sort_order của task (drag & drop reorder)
 *
 * v4: Accepts newTaskStatusId (UUID).
 * When dragging between Kanban columns, validates against DB workflow transitions.
 * Permission check: user must be org member.
 *
 * Used by: Kanban board drag-within-column, List view reorder
 */
export default class UpdateTaskSortOrderCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(taskId: DatabaseId, newSortOrder: number, newTaskStatusId?: string): Promise<Task> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    if (typeof newSortOrder !== 'number' || newSortOrder < 0) {
      throw new ValidationException('sort_order phải là số >= 0')
    }

    const trx = await db.transaction()

    try {
      const task = await TaskRepository.findActiveForUpdate(taskId, trx)

      const accessContext = await buildTaskCollectionAccessContext(
        userId,
        task.organization_id,
        'none',
        trx
      )
      enforcePolicy(canReorderTask(accessContext))

      // Update sort order
      task.sort_order = newSortOrder

      // Optionally update status (when dragging between Kanban columns)
      const resolvedStatus = newTaskStatusId
        ? await TaskStatusRepository.findByIdAndOrgActive(
            newTaskStatusId,
            task.organization_id,
            trx
          )
        : null

      if (newTaskStatusId) {
        const newStatus = resolvedStatus

        if (!newStatus) {
          throw new BusinessLogicException(
            'Trạng thái mới không tồn tại hoặc không thuộc tổ chức này'
          )
        }

        const resolvedNewTaskStatusId = newStatus.id

        const currentStatusId = task.task_status_id

        if (!currentStatusId) {
          throw new BusinessLogicException('Task chưa có task_status_id hợp lệ để thay đổi cột')
        }

        const shouldChangeStatus = task.task_status_id !== resolvedNewTaskStatusId

        if (shouldChangeStatus) {
          const currentStatusDef = await TaskStatusRepository.findByIdAndOrgActive(
            currentStatusId,
            task.organization_id,
            trx
          )

          // Lock task movement once it is done and already has a review session.
          if (currentStatusDef?.category === TaskStatusCategory.DONE) {
            if (await DefaultTaskDependencies.review.hasAnyReviewForTask(task.id, trx)) {
              throw new BusinessLogicException(
                'Task đã hoàn thành và có review, không thể kéo sang trạng thái khác'
              )
            }
          }

          const oldStatus = task.status
          task.task_status_id = resolvedNewTaskStatusId
          task.status = newStatus.category // backward compat: category only

          // Emit status changed event after commit
          void trx.on('commit', () => {
            void emitter.emit('task:status:changed', {
              task,
              oldStatus,
              newStatusId: resolvedNewTaskStatusId,
              newStatus: newStatus.slug,
              newStatusCategory: newStatus.category,
              changedBy: userId,
            })
          })
        }
      }

      task.updated_by = userId

      await TaskRepository.save(task, trx)
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
