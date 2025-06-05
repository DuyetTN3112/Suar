import Task from '#models/task'
import TaskStatusRepository from '#repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#repositories/task_workflow_transition_repository'
import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import db from '@adonisjs/lucid/services/db'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CacheService from '#services/cache_service'
import loggerService from '#services/logger_service'
import emitter from '@adonisjs/core/services/emitter'
import { validateWorkflowTransition } from '#domain/tasks/task_status_rules'
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { validateBatchStatusUpdate } from '#domain/tasks/task_assignment_rules'

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
        newStatus: newTaskStatusId,
        maxBatchSize: 50,
      })
    )

    const trx = await db.transaction()
    const failed: DatabaseId[] = []

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
      const tasks = await Task.query({ client: trx })
        .whereIn('id', taskIds)
        .where('organization_id', organizationId)
        .whereNull('deleted_at')

      // ── DECIDE + PERSIST (per task) ────────────────────────────────────
      let updated = 0

      for (const task of tasks) {
        // Resolve current task_status_id (backward compat)
        let currentStatusId = task.task_status_id
        if (!currentStatusId) {
          const currentStatus = await TaskStatusRepository.findBySlug(
            task.organization_id,
            task.status,
            trx
          )
          currentStatusId = currentStatus?.id ?? null
        }

        if (!currentStatusId) {
          failed.push(task.id)
          continue
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

        if (result.allowed) {
          const oldStatus = task.status
          task.task_status_id = newTaskStatusId
          task.status = newStatus.slug // backward compat
          task.updated_by = userId
          await task.useTransaction(trx).save()
          updated++

          // Emit event per task
          if (oldStatus !== newStatus.slug) {
            void emitter.emit('task:status:changed', {
              task,
              oldStatus,
              newStatus: newStatus.slug,
              newStatusCategory: newStatus.category,
              changedBy: userId,
            })
          }
        } else {
          failed.push(task.id)
        }
      }

      await trx.commit()

      // Invalidate caches
      await CacheService.invalidateEntityType('tasks')

      return { updated, failed }
    } catch (error) {
      await trx.rollback()
      loggerService.error('[BatchUpdateTaskStatusCommand] Error:', error)
      throw error
    }
  }
}
