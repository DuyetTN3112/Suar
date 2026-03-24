import db from '@adonisjs/lucid/services/db'

/**
 * AdminTaskRepository (Infrastructure Layer)
 *
 * Handles task statistics queries for admin dashboard.
 */

export interface DashboardTaskStats {
  total: number
  inProgress: number
  completed: number
}

export default class AdminTaskRepository {
  /**
   * Get task statistics for dashboard
   */
  async getTaskStats(): Promise<DashboardTaskStats> {
    const [total, inProgress, completed] = await Promise.all([
      db.from('tasks').count('* as total').whereNull('deleted_at').first(),
      db
        .from('tasks')
        .count('* as total')
        .whereIn('status', ['in_progress', 'in_review']) // in_progress category includes in_review
        .whereNull('deleted_at')
        .first(),
      db
        .from('tasks')
        .count('* as total')
        .where('status', 'done')
        .whereNull('deleted_at')
        .first(),
    ])

    return {
      total: Number(total?.total || 0),
      inProgress: Number(inProgress?.total || 0),
      completed: Number(completed?.total || 0),
    }
  }
}
