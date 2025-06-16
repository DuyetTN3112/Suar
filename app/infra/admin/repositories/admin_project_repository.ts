import db from '@adonisjs/lucid/services/db'

/**
 * AdminProjectRepository (Infrastructure Layer)
 *
 * Handles project statistics queries for admin dashboard.
 */

export interface DashboardProjectStats {
  total: number
  active: number
  completed: number
}

export default class AdminProjectRepository {
  /**
   * Get project statistics for dashboard
   */
  async getProjectStats(): Promise<DashboardProjectStats> {
    const [total, active, completed] = await Promise.all([
      db.from('projects').count('* as total').whereNull('deleted_at').first(),
      db
        .from('projects')
        .count('* as total')
        .where('status', 'in_progress')
        .whereNull('deleted_at')
        .first(),
      db
        .from('projects')
        .count('* as total')
        .where('status', 'completed')
        .whereNull('deleted_at')
        .first(),
    ])

    return {
      total: Number(total?.total || 0),
      active: Number(active?.total || 0),
      completed: Number(completed?.total || 0),
    }
  }
}
