import db from '@adonisjs/lucid/services/db'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

/**
 * OrganizationTaskRepository (Infrastructure Layer)
 *
 * Handles task queries for organization dashboard.
 */

export interface DashboardTaskStats {
  total: number
  inProgress: number
  completed: number
  overdue: number
}

export default class OrganizationTaskRepository {
  /**
   * Get task statistics for organization dashboard
   */
  async getTaskStats(organizationId: string): Promise<DashboardTaskStats> {
    const now = new Date()

    const results = (await Promise.all([
      // total
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .count('tasks.id as total')
        .where('projects.organization_id', organizationId)
        .whereNull('tasks.deleted_at')
        .first(),
      // in_progress
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .innerJoin('task_statuses as ts', 'tasks.task_status_id', 'ts.id')
        .count('tasks.id as total')
        .where('projects.organization_id', organizationId)
        .where('ts.category', 'in_progress')
        .whereNull('tasks.deleted_at')
        .first(),
      // completed
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .innerJoin('task_statuses as ts', 'tasks.task_status_id', 'ts.id')
        .count('tasks.id as total')
        .where('projects.organization_id', organizationId)
        .where('ts.category', 'done')
        .whereNull('tasks.deleted_at')
        .first(),
      // overdue
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .innerJoin('task_statuses as ts', 'tasks.task_status_id', 'ts.id')
        .count('tasks.id as total')
        .where('projects.organization_id', organizationId)
        .where('tasks.due_date', '<', now)
        .whereNotIn('ts.category', ['done', 'cancelled'])
        .whereNull('tasks.deleted_at')
        .first(),
    ])) as unknown[]

    const [totalRow = 0, inProgressRow = 0, completedRow = 0, overdueRow = 0] = results.map(
      (row) => (isRecord(row) ? toNumberValue(row.total) : 0)
    )

    return {
      total: totalRow,
      inProgress: inProgressRow,
      completed: completedRow,
      overdue: overdueRow,
    }
  }
}
