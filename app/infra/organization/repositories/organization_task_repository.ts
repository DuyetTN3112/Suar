import db from '@adonisjs/lucid/services/db'

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

    const [total, inProgress, completed, overdue] = await Promise.all([
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
    ])

    return {
      total: Number(total?.total || 0),
      inProgress: Number(inProgress?.total || 0),
      completed: Number(completed?.total || 0),
      overdue: Number(overdue?.total || 0),
    }
  }
}
