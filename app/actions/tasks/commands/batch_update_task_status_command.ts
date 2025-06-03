import Task from '#models/task'
import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import db from '@adonisjs/lucid/services/db'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { TaskStatus } from '#constants/task_constants'
import CacheService from '#services/cache_service'
import loggerService from '#services/logger_service'
import { validateTransition } from '#actions/tasks/rules/task_state_machine'
import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
import { validateBatchStatusUpdate } from '#actions/tasks/rules/task_assignment_rules'

/**
 * Command để batch update status cho nhiều tasks cùng lúc
 *
 * Used by: Multi-select → bulk status change
 *
 * Pattern: FETCH → DECIDE → PERSIST (per task)
 */
export default class BatchUpdateTaskStatusCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(
    taskIds: DatabaseId[],
    newStatus: string,
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
        newStatus,
        maxBatchSize: 50,
      })
    )

    const trx = await db.transaction()
    const failed: DatabaseId[] = []

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const tasks = await Task.query({ client: trx })
        .whereIn('id', taskIds)
        .where('organization_id', organizationId)
        .whereNull('deleted_at')

      // ── DECIDE + PERSIST (per task) ────────────────────────────────────
      let updated = 0

      for (const task of tasks) {
        const result = validateTransition({
          currentStatus: task.status,
          newStatus,
          isAssigned: task.assigned_to !== null,
        })

        if (result.allowed) {
          task.status = newStatus
          task.updated_by = userId
          await task.useTransaction(trx).save()
          updated++
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
