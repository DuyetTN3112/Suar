import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { validateBatchStatusUpdate } from '#domain/tasks/task_assignment_rules'
import { validateWorkflowTransition } from '#domain/tasks/task_status_rules'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ConflictException from '#exceptions/conflict_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#infra/tasks/repositories/task_workflow_transition_repository'
import type Task from '#models/task'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

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
  constructor(protected execCtx: ExecutionContext) {}

  async execute(
    taskIds: DatabaseId[],
    newTaskStatusId: string,
    organizationId: DatabaseId
  ): Promise<{ updated: number; failed: DatabaseId[] }> {
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
      const tasks = await TaskRepository.findActiveByIdsInOrganization(taskIds, organizationId, trx)

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
      const eventsToEmit: { task: Task; oldStatus: string }[] = []

      for (const task of tasks) {
        const currentStatusId = task.task_status_id

        if (!currentStatusId) {
          throw new ConflictException(
            `Không thể cập nhật task ${task.id} vì thiếu task_status_id hợp lệ`
          )
        }

        // Load transitions for this task's current status
        const transitions = await TaskWorkflowTransitionRepository.findFromStatus(
          organizationId,
          currentStatusId,
          trx
        )

        const matchingTransition = transitions.find((t) => t.to_status_id === newTaskStatusId)

        const result = validateWorkflowTransition({
          currentStatusId,
          newStatusId: newTaskStatusId,
          allowedTargetIds: transitions.map((t) => t.to_status_id),
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
        task.task_status_id = newTaskStatusId
        task.status = newStatus.category // backward compat: category only
        task.updated_by = userId
        await TaskRepository.save(task, trx)
        updated++

        // Queue event and emit after commit.
        if (oldTaskStatusId !== newTaskStatusId) {
          eventsToEmit.push({ task, oldStatus })
        }
      }

      await trx.commit()

      for (const event of eventsToEmit) {
        void emitter.emit('task:status:changed', {
          task: event.task,
          oldStatus: event.oldStatus,
          newStatusId: newTaskStatusId,
          newStatus: newStatus.slug,
          newStatusCategory: newStatus.category,
          changedBy: userId,
        })
      }

      // Invalidate caches
      await CacheService.invalidateEntityType('tasks')

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
