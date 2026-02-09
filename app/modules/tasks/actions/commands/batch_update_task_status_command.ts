import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { validateBatchStatusUpdate } from '#modules/tasks/domain/task_assignment_rules'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
import { validateWorkflowTransition } from '#modules/tasks/domain/task_status_rules'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord } from '#modules/tasks/types/task_records'

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
    private cache: TaskCachePort
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

    const trx = await db.transaction()
    try {
      // Verify the target status exists and belongs to this org
      const newStatus = await TaskStatusRepository.findByIdAndOrgActive(
        newTaskStatusId,
        organizationId,
        trx
      )

      if (!newStatus) {
        throw new BusinessLogicException(
          'Trạng thái mới không tồn tại hoặc không thuộc tổ chức này'
        )
      }

      // ── FETCH ──────────────────────────────────────────────────────────
      const tasks = await detailQueries.findActiveByIdsInOrganizationAsRecords(
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

      // ── DECIDE + PERSIST (per task) ────────────────────────────────────
      let updated = 0
      const eventsToEmit: { task: TaskRecord; oldStatus: string }[] = []
      const workflowTransitions = await TaskWorkflowTransitionRepository.findByOrganization(
        organizationId,
        trx
      )
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

        const oldStatus = task.status
        const oldTaskStatusId = task.task_status_id
        
        const updatedTask = await taskMutations.updateTask(
          task.id,
          {
            task_status_id: newTaskStatusId,
            status: toLegacyTaskStatusMirror(newStatus),
            updated_by: userId,
          },
          trx
        )
        updated++

        // Queue event and emit after commit.
        if (oldTaskStatusId !== newTaskStatusId) {
          eventsToEmit.push({ task: updatedTask, oldStatus })
        }
      }

      await trx.commit()

      for (const event of eventsToEmit) {
        void emitter.emit('task:status:changed', {
          taskId: event.task.id,
          assignedTo: event.task.assigned_to,
          oldStatus: event.oldStatus,
          newStatusId: newTaskStatusId,
          newStatus: newStatus.slug,
          newStatusCategory: newStatus.category,
          changedBy: userId,
        })
      }

      await this.cache.invalidateAfterTaskCreated()
      for (const taskId of taskIds) {
        await this.cache.invalidateAfterTaskUpdated(taskId)
      }

      return { updated, failed: [] }
    } catch (error) {
      await trx.rollback()
      if (error instanceof ConflictException) {
        loggerService.warn('[BatchUpdateTaskStatusCommand] Conflict:', error.message)
      } else {
        loggerService.error('[BatchUpdateTaskStatusCommand] Error:', error)
      }
      throw error
    }
  }
}
