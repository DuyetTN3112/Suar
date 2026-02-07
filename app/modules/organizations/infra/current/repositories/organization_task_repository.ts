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
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .count('tasks.id as total')
        .where('projects.organization_id', organizationId)
        .whereNull('tasks.deleted_at')
        .first(),
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .count('tasks.id as total')
        .where('projects.organization_id', organizationId)
        .whereIn('tasks.status', ['in_progress', 'in_review']) // in_progress category includes in_review
        .whereNull('tasks.deleted_at')
        .first(),
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .count('tasks.id as total')
        .where('projects.organization_id', organizationId)
        .where('tasks.status', 'done')
        .whereNull('tasks.deleted_at')
        .first(),
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .count('tasks.id as total')
        .where('projects.organization_id', organizationId)
        .where('tasks.due_date', '<', now)
        .whereNotIn('tasks.status', ['done', 'cancelled'])
        .whereNull('tasks.deleted_at')
        .first(),
    ])) as unknown[]

    const total = results[0]
    const inProgress = results[1]
    const completed = results[2]
    const overdue = results[3]

    return {
      total: isRecord(total) ? toNumberValue(total.total) : 0,
      inProgress: isRecord(inProgress) ? toNumberValue(inProgress.total) : 0,
      completed: isRecord(completed) ? toNumberValue(completed.total) : 0,
      overdue: isRecord(overdue) ? toNumberValue(overdue.total) : 0,
    }
  }
}
