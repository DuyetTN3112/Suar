import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'


import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ValidationException from '#modules/http/exceptions/validation_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canReorderTask } from '#modules/tasks/domain/task_permission_policy'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
import { validateWorkflowTransition } from '#modules/tasks/domain/task_status_rules'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import { TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

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
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private cache: TaskCachePort
  ) {}

  async execute(taskId: string, newSortOrder: number, newTaskStatusId?: string): Promise<TaskDetailRecord> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    if (typeof newSortOrder !== 'number' || newSortOrder < 0) {
      throw new ValidationException('sort_order phải là số >= 0')
    }

    const trx = await db.transaction()

    try {
      const task = await taskMutations.findActiveForUpdateAsRecord(taskId, trx)

      const accessContext = await buildTaskCollectionAccessContext(
        userId,
        task.organization_id,
        'none',
        trx,
        this.taskExternalDependencies.permission
      )
      enforcePolicy(canReorderTask(accessContext))

      const updateData: Record<string, unknown> = {
        sort_order: newSortOrder,
        updated_by: userId,
      }

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
            if (await this.taskExternalDependencies.review.hasAnyReviewForTask(task.id, trx)) {
              throw new BusinessLogicException(
                'Task đã hoàn thành và có review, không thể kéo sang trạng thái khác'
              )
            }
          }

          const transitions = await TaskWorkflowTransitionRepository.findFromStatus(
            task.organization_id,
            currentStatusId,
            trx
          )
          const organizationTransitions =
            transitions.length > 0
              ? transitions
              : await TaskWorkflowTransitionRepository.findByOrganization(task.organization_id, trx)
          const workflowConfigured =
            transitions.length > 0 || organizationTransitions.length > 0
          const matchingTransition = transitions.find(
            (transition) => transition.to_status_id === resolvedNewTaskStatusId
          )

          enforcePolicy(
            validateWorkflowTransition({
              currentStatusId,
              newStatusId: resolvedNewTaskStatusId,
              allowedTargetIds: transitions.map((transition) => transition.to_status_id),
              workflowConfigured,
              conditions: matchingTransition?.conditions ?? {},
              isAssigned: task.assigned_to !== null,
            })
          )

          const oldStatus = task.status
          updateData.task_status_id = resolvedNewTaskStatusId
          updateData.status = toLegacyTaskStatusMirror(newStatus)

          // Emit status changed event after commit
          void trx.on('commit', () => {
            void emitter.emit('task:status:changed', {
              taskId: task.id,
              assignedTo: task.assigned_to,
              oldStatus,
              newStatusId: resolvedNewTaskStatusId,
              newStatus: newStatus.slug,
              newStatusCategory: newStatus.category,
              changedBy: userId,
            })
          })
        }
      }

      const updatedTask = await taskMutations.updateTask(task.id, updateData, trx)
      await trx.commit()

      await this.cache.invalidateAfterTaskUpdated(task.id)

      return await detailQueries.findByIdWithDetailRecord(updatedTask.id)
    } catch (error) {
      await trx.rollback()
      loggerService.error('[UpdateTaskSortOrderCommand] Error:', error)
      throw error
    }
  }
}
