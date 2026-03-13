import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { TaskStatus, TERMINAL_TASK_STATUSES } from '#constants'
import Task from '#models/task'

/**
 * TaskRepository
 *
 * Data access for tasks (aggregate queries, bulk mutations).
 * Extracted from Task model static methods.
 */
export default class TaskRepository {
  static async countIncompleteByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? Task.query({ client: trx }) : Task.query()
    const result = await query
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .whereNotIn('status', TERMINAL_TASK_STATUSES as unknown as string[])
      .count('* as total')
    return Number((result[0] as any)?.$extras?.total ?? 0)
  }

  static async reassignByUser(
    projectId: DatabaseId,
    fromUserId: DatabaseId,
    toUserId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? Task.query({ client: trx }) : Task.query()
    await query
      .where('project_id', projectId)
      .where('assigned_to', fromUserId)
      .whereNull('deleted_at')
      .update({
        assigned_to: String(toUserId),
        updated_at: new Date(),
      })
  }

  static async unassignByUserInProjects(
    projectIds: DatabaseId[],
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    if (projectIds.length === 0) return
    const query = trx ? Task.query({ client: trx }) : Task.query()
    await query
      .whereIn('project_id', projectIds)
      .where('assigned_to', userId)
      .whereNull('deleted_at')
      .update({
        assigned_to: null,
        updated_at: new Date(),
      })
  }

  /**
   * Get task summary stats for a project.
   * Contains in-memory business logic for overdue calculation.
   */
  static async getTasksSummaryByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<{
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }> {
    const query = trx ? Task.query({ client: trx }) : Task.query()
    const tasks = await query
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .select('status', 'due_date')

    const now = new Date()
    let pending = 0
    let inProgress = 0
    let completed = 0
    let overdue = 0

    for (const task of tasks) {
      if (task.status === TaskStatus.TODO) pending++
      else if (task.status === TaskStatus.IN_PROGRESS) inProgress++
      else if (task.status === TaskStatus.DONE) completed++

      if (
        ![TaskStatus.DONE, TaskStatus.CANCELLED].includes(task.status as TaskStatus) &&
        task.due_date
      ) {
        const dueDate =
          task.due_date instanceof Date ? task.due_date : new Date(String(task.due_date))
        if (dueDate < now) overdue++
      }
    }

    return {
      total: tasks.length,
      pending,
      in_progress: inProgress,
      completed,
      overdue,
    }
  }

  static async countByAssignees(
    projectId: DatabaseId,
    userIds?: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    const query = trx ? Task.query({ client: trx }) : Task.query()
    let q = query
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .whereNotNull('assigned_to')
      .select('assigned_to')
      .count('* as total')
      .groupBy('assigned_to')

    if (userIds && userIds.length > 0) {
      q = q.whereIn('assigned_to', userIds)
    }

    const results = await q
    const map = new Map<string, number>()
    for (const row of results) {
      map.set(String(row.assigned_to), Number((row as any)?.$extras?.total ?? 0))
    }
    return map
  }

  static async countByProjectIds(
    projectIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map()
    const query = trx ? Task.query({ client: trx }) : Task.query()
    const results = await query
      .whereIn('project_id', projectIds)
      .whereNull('deleted_at')
      .select('project_id')
      .count('* as total')
      .groupBy('project_id')

    const map = new Map<string, number>()
    for (const row of results) {
      map.set(String(row.project_id), Number((row as any)?.$extras?.total ?? 0))
    }
    return map
  }
}
