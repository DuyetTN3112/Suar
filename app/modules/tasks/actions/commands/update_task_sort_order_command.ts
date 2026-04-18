import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type CompleteTaskAssignmentsCommand from '#modules/tasks/actions/commands/complete_task_assignments_command'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  buildTaskCollectionAccessContext,
  buildTaskPermissionContext,
} from '#modules/tasks/actions/services/task_permission_context_resolver'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/services/task_post_commit_effect_settler'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canReorderTask, canUpdateTaskStatus } from '#modules/tasks/domain/task_permission_policy'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
import { validateWorkflowTransition } from '#modules/tasks/domain/task_status_rules'
import { TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

/**
 * Command để cập nhật sort_order của task (drag & drop reorder)
 *
 * v4: Accepts newTaskStatusId (UUID).
 * When dragging between Kanban columns, validates against DB workflow transitions.
 * Permission check: status changes require project membership; same-column reorder requires org membership.
 *
 * Used by: Kanban board drag-within-column, List view reorder
 */
export default class UpdateTaskSortOrderCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher,
    private readonly completeTaskAssignments: CompleteTaskAssignmentsCommand
  ) {}

  async execute(
    taskId: string,
    newSortOrder: number,
    newTaskStatusId?: string
  ): Promise<TaskDetailRecord> {
    const userId = this.execCtx.userId
    loggerService.info('[UpdateTaskSortOrderCommand] execute started', {
      taskId,
      newSortOrder,
      newTaskStatusId,
      userId,
    })

    if (!userId) {
      throw new UnauthorizedException()
    }

    if (typeof newSortOrder !== 'number' || newSortOrder < 0) {
      throw new ValidationException('sort_order phải là số >= 0')
    }

    let persisted: {
      detail: TaskDetailRecord
      statusChangedEvent: Parameters<TaskEventPublisher['publishTaskStatusChanged']>[0] | null
    }

    try {
      persisted = await this.taskExternalDependencies.transactions.run(async (trx) => {
        let statusChangedEvent:
          | Parameters<TaskEventPublisher['publishTaskStatusChanged']>[0]
          | null = null
        const task = await this.taskExternalDependencies.lifecycle.lockActiveTask(taskId, trx)

        const updateData: Record<string, unknown> = {
          sort_order: newSortOrder,
          updated_by: userId,
        }

        // Optionally update status (when dragging between Kanban columns)
        const resolvedStatus = newTaskStatusId
          ? await this.taskExternalDependencies.lifecycle.findActiveStatus(
              newTaskStatusId,
              task.organization_id,
              trx
            )
          : null

        if (newTaskStatusId) {
          const newStatus = resolvedStatus

          if (!newStatus) {
            loggerService.info('[UpdateTaskSortOrderCommand] status rejected: not found', {
              taskId,
              newTaskStatusId,
              organizationId: task.organization_id,
            })
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

          loggerService.info('[UpdateTaskSortOrderCommand] status resolution', {
            taskId,
            currentStatusId,
            resolvedNewTaskStatusId,
            shouldChangeStatus,
            newSortOrder,
          })

          if (shouldChangeStatus) {
            const permissionContext = await buildTaskPermissionContext(
              userId,
              task,
              trx,
              this.taskExternalDependencies.permission,
              this.taskExternalDependencies.activeAssignmentReader
            )
            enforcePolicy(canUpdateTaskStatus(permissionContext))

            const currentStatusDef = await this.taskExternalDependencies.lifecycle.findActiveStatus(
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

            const transitions =
              await this.taskExternalDependencies.lifecycle.findWorkflowTransitionsFromStatus(
                task.organization_id,
                currentStatusId,
                trx
              )
            const organizationTransitions =
              transitions.length > 0
                ? transitions
                : await this.taskExternalDependencies.lifecycle.listWorkflowTransitions(
                    task.organization_id,
                    trx
                  )
            const workflowConfigured = transitions.length > 0 || organizationTransitions.length > 0
            const matchingTransition = transitions.find(
              (transition) => transition.to_status_id === resolvedNewTaskStatusId
            )

            loggerService.info('[UpdateTaskSortOrderCommand] workflow validation', {
              taskId,
              currentStatusId,
              resolvedNewTaskStatusId,
              directTransitionCount: transitions.length,
              organizationTransitionCount: organizationTransitions.length,
              workflowConfigured,
              matchingTransitionId: matchingTransition?.id,
              isAssigned: task.assigned_to !== null,
            })

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

            if (newStatus.category === 'done') {
              const bypassTypes = [
                'research_spike',
                'poc',
                'prototype',
                'technical_writing',
                'documentation',
                'knowledge_transfer',
                'mentoring',
                'product_management',
              ]
              if (!(task.task_type && bypassTypes.includes(task.task_type))) {
                if (
                  !(await this.taskExternalDependencies.lifecycle.hasReviewableSubmission(
                    task.id,
                    trx
                  ))
                ) {
                  throw new BusinessLogicException(
                    'Task cannot move to DONE without a valid submission (submitted, accepted_for_review, or locked)'
                  )
                }
              }
            }

            const oldStatus = task.status
            updateData['task_status_id'] = resolvedNewTaskStatusId
            updateData['status'] = toLegacyTaskStatusMirror(newStatus)
            statusChangedEvent = {
              taskId: task.id,
              organizationId: task.organization_id,
              assignedTo: task.assigned_to,
              oldStatus,
              newStatusId: resolvedNewTaskStatusId,
              newStatus: newStatus.slug,
              newStatusCategory: newStatus.category,
              changedBy: userId,
            }
          } else {
            const accessContext = await buildTaskCollectionAccessContext(
              userId,
              task.organization_id,
              'none',
              trx,
              this.taskExternalDependencies.permission
            )
            enforcePolicy(canReorderTask(accessContext))
          }
        } else {
          const accessContext = await buildTaskCollectionAccessContext(
            userId,
            task.organization_id,
            'none',
            trx,
            this.taskExternalDependencies.permission
          )
          enforcePolicy(canReorderTask(accessContext))
        }

        const updatedTask = await this.taskExternalDependencies.lifecycle.updateTask(
          task.id,
          updateData,
          trx
        )
        if (statusChangedEvent?.newStatusCategory === 'done') {
          await this.completeTaskAssignments.execute(
            {
              taskId: updatedTask.id,
              assignedTo: updatedTask.assigned_to,
              changedBy: userId,
            },
            trx
          )
        }
        const detail = await this.taskExternalDependencies.lifecycle.findTaskDetail(
          updatedTask.id,
          trx
        )
        return { detail, statusChangedEvent }
      })
    } catch (error) {
      loggerService.error('[UpdateTaskSortOrderCommand] Error', {
        error: serializeObservabilityError(error),
      })
      throw error
    }

    const statusChangedEvent = persisted.statusChangedEvent
    await settleTaskPostCommitEffects({
      operation: 'task.sort_order.update',
      context: {
        taskId,
        targetTaskStatusId: newTaskStatusId ?? null,
      },
      effects: [
        {
          name: `cache.task.invalidate_now.${taskId}`,
          run: () =>
            this.cache.invalidateAfterTaskUpdated(taskId, persisted.detail.organization_id),
        },
        ...(statusChangedEvent
          ? [
              {
                name: `event.task_status_changed.${taskId}`,
                run: () => this.taskEventPublisher.publishTaskStatusChanged(statusChangedEvent),
              },
            ]
          : []),
      ],
    })

    loggerService.info('[UpdateTaskSortOrderCommand] execute completed', {
      taskId: persisted.detail.id,
      sortOrder: persisted.detail.sort_order,
      taskStatusId: persisted.detail.task_status_id,
      status: persisted.detail.status,
    })

    return persisted.detail
  }
}
