import Task from '#models/task'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import db from '@adonisjs/lucid/services/db'
import ReviewSession from '#models/review_session'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ValidationException from '#exceptions/validation_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CacheService from '#services/cache_service'
import loggerService from '#services/logger_service'
import emitter from '@adonisjs/core/services/emitter'
import { TaskStatusCategory } from '#constants/task_constants'

/**
 * Command để cập nhật sort_order của task (drag & drop reorder)
 *
 * v4: Accepts newTaskStatusId (UUID) instead of newStatus (string).
 * When dragging between Kanban columns, validates against DB workflow transitions.
 * Permission check: user must be org member.
 *
 * Used by: Kanban board drag-within-column, List view reorder
 */
export default class UpdateTaskSortOrderCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(
    taskId: DatabaseId,
    newSortOrder: number,
    newTaskStatusId?: string,
    newStatusSlug?: string
  ): Promise<Task> {
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

      // Permission check: user must be approved org member
      const isOrgMember = await OrganizationUserRepository.isApprovedMember(
        userId,
        task.organization_id,
        trx
      )
      if (!isOrgMember) {
        throw new UnauthorizedException('Bạn không có quyền sắp xếp task trong tổ chức này')
      }

      task.useTransaction(trx)

      // Update sort order
      task.sort_order = newSortOrder

      // Optionally update status (when dragging between Kanban columns)
      const resolvedStatus = newTaskStatusId
        ? await TaskStatusRepository.findByIdAndOrgActive(newTaskStatusId, task.organization_id, trx)
        : newStatusSlug
          ? await TaskStatusRepository.findBySlug(task.organization_id, newStatusSlug, trx)
          : null

      if (newTaskStatusId || newStatusSlug) {
        const newStatus = resolvedStatus

        if (!newStatus) {
          throw new BusinessLogicException(
            'Trạng thái mới không tồn tại hoặc không thuộc tổ chức này'
          )
        }

        const resolvedNewTaskStatusId = newStatus.id

        // Resolve current task_status_id (backward compat)
        let currentStatusId = task.task_status_id
        if (!currentStatusId) {
          const currentStatus = await TaskStatusRepository.findBySlug(
            task.organization_id,
            task.status,
            trx
          )
          if (currentStatus) {
            currentStatusId = currentStatus.id
          }
        }

        const shouldChangeStatus =
          task.task_status_id !== resolvedNewTaskStatusId || task.status !== newStatus.slug

        if (shouldChangeStatus) {
          const currentStatusDef = await TaskStatusRepository.findByIdAndOrgActive(
            currentStatusId ?? '',
            task.organization_id,
            trx
          )

          // Lock task movement once it is done and already has a review session.
          if (currentStatusDef?.category === TaskStatusCategory.DONE) {
            const hasReviewSession = await ReviewSession.query({ client: trx })
              .whereHas('task_assignment', (q) => {
                void q.where('task_id', task.id)
              })
              .first()

            if (hasReviewSession) {
              throw new BusinessLogicException(
                'Task đã hoàn thành và có review, không thể kéo sang trạng thái khác'
              )
            }
          }

          const oldStatus = task.status
          task.task_status_id = resolvedNewTaskStatusId
          task.status = newStatus.slug // backward compat

          // Emit status changed event after commit
          void trx.on('commit', () => {
            void emitter.emit('task:status:changed', {
              task,
              oldStatus,
              newStatus: newStatus.slug,
              newStatusCategory: newStatus.category,
              changedBy: userId,
            })
          })
        }
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
