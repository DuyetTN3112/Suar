import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type CompleteTaskAssignmentsCommand from '#modules/tasks/actions/commands/complete_task_assignments_command'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/services/task_post_commit_effect_settler'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { validateBatchStatusUpdate } from '#modules/tasks/domain/task_assignment_rules'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
import { validateWorkflowTransition } from '#modules/tasks/domain/task_status_rules'

/**
 * Command để batch update status cho nhiều tasks cùng lúc
 *
 * v4: Uses DB-driven workflow validation via task_workflow_transitions.
 * Accepts task_status_id (UUID) instead of status string.
 *
 * Used by: Multi-select → bulk status change
 *
 * Pattern: FETCH → DECIDE → PERSIST (per task)
 */
export default class BatchUpdateTaskStatusCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private readonly taskExternalDependencies: TaskExternalDependencies,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher,
    private readonly completeTaskAssignments: CompleteTaskAssignmentsCommand
  ) {}

  async execute(
    taskIds: string[],
    newTaskStatusId: string,
    organizationId: string
  ): Promise<{ updated: number; failed: string[] }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Validate batch request via pure rule
    enforcePolicy(
      validateBatchStatusUpdate({
        taskCount: taskIds.length,
        newStatusId: newTaskStatusId,
        maxBatchSize: 50,
      })
    )

    let persisted: {
      updated: number
      events: Parameters<TaskEventPublisher['publishTaskStatusChanged']>[0][]
    }

    try {
      persisted = await this.taskExternalDependencies.transactions.run(async (trx) => {
        // Verify the target status exists and belongs to this org
        const newStatus = await this.taskExternalDependencies.lifecycle.findActiveStatus(
          newTaskStatusId,
          organizationId,
          trx
        )

        if (!newStatus) {
          throw new BusinessLogicException(
            'Trạng thái mới không tồn tại hoặc không thuộc tổ chức này'
          )
        }

        // ── FETCH ────────────────────────────────────────────────────────
        const tasks = await this.taskExternalDependencies.lifecycle.findActiveTasksByIds(
          taskIds,
          organizationId,
          trx
        )

        // Atomic mode: if any requested task is missing from organization scope, fail the whole batch.
        if (tasks.length !== taskIds.length) {
          const foundIds = new Set(tasks.map((task) => task.id))
          const missingIds = taskIds.filter((id) => !foundIds.has(id))
          throw new ConflictException(
            `Không thể cập nhật hàng loạt vì có task không hợp lệ hoặc ngoài phạm vi tổ chức: ${missingIds.join(', ')}`
          )
        }

        // ── DECIDE + PERSIST (per task) ──────────────────────────────────
        let updated = 0
        const events: Parameters<TaskEventPublisher['publishTaskStatusChanged']>[0][] = []
        const workflowTransitions =
          await this.taskExternalDependencies.lifecycle.listWorkflowTransitions(organizationId, trx)
        const workflowConfigured = workflowTransitions.length > 0

        for (const task of tasks) {
          const currentStatusId = task.task_status_id

          if (!currentStatusId) {
            throw new ConflictException(
              `Không thể cập nhật task ${task.id} vì thiếu task_status_id hợp lệ`
            )
          }

          const transitions = workflowTransitions.filter(
            (transition) => transition.from_status_id === currentStatusId
          )

          const matchingTransition = transitions.find((t) => t.to_status_id === newTaskStatusId)

          const result = validateWorkflowTransition({
            currentStatusId,
            newStatusId: newTaskStatusId,
            allowedTargetIds: transitions.map((t) => t.to_status_id),
            workflowConfigured,
            conditions: matchingTransition?.conditions ?? {},
            isAssigned: task.assigned_to !== null,
          })

          if (!result.allowed) {
            throw new ConflictException(
              `Không thể chuyển trạng thái task ${task.id} theo workflow hiện tại`
            )
          }

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
                throw new ConflictException(
                  `Không thể chuyển trạng thái task ${task.id} sang DONE vì thiếu submission hợp lệ`
                )
              }
            }
          }

          const oldStatus = task.status
          const oldTaskStatusId = task.task_status_id

          const updatedTask = await this.taskExternalDependencies.lifecycle.updateTask(
            task.id,
            {
              task_status_id: newTaskStatusId,
              status: toLegacyTaskStatusMirror(newStatus),
              updated_by: userId,
            },
            trx
          )
          updated++

          if (oldTaskStatusId !== newTaskStatusId) {
            if (newStatus.category === 'done') {
              await this.completeTaskAssignments.execute(
                {
                  taskId: updatedTask.id,
                  assignedTo: updatedTask.assigned_to,
                  changedBy: userId,
                },
                trx
              )
            }
            events.push({
              taskId: updatedTask.id,
              organizationId,
              assignedTo: updatedTask.assigned_to,
              oldStatus,
              newStatusId: newTaskStatusId,
              newStatus: newStatus.slug,
              newStatusCategory: newStatus.category,
              changedBy: userId,
            })
          }
        }

        return { updated, events }
      })
    } catch (error) {
      if (error instanceof ConflictException) {
        loggerService.warn('[BatchUpdateTaskStatusCommand] Conflict', {
          error: serializeObservabilityError(error),
        })
      } else {
        loggerService.error('[BatchUpdateTaskStatusCommand] Error', {
          error: serializeObservabilityError(error),
        })
      }
      throw error
    }

    await settleTaskPostCommitEffects({
      operation: 'task_status.batch_update',
      context: {
        organizationId,
        taskIds,
        targetTaskStatusId: newTaskStatusId,
      },
      effects: [
        ...persisted.events.map((event) => ({
          name: `event.task_status_changed.${event.taskId}`,
          run: () => this.taskEventPublisher.publishTaskStatusChanged(event),
        })),
        {
          name: 'cache.collections.invalidate_now',
          run: () => this.cache.invalidateAfterTaskCreated(organizationId),
        },
        ...taskIds.map((taskId) => ({
          name: `cache.task.invalidate_now.${taskId}`,
          run: () => this.cache.invalidateAfterTaskUpdated(taskId, organizationId),
        })),
      ],
    })

    return { updated: persisted.updated, failed: [] }
  }
}
