import db from '@adonisjs/lucid/services/db'

/**
 * OrganizationProjectRepository (Infrastructure Layer)
 *
 * Handles project queries for organization dashboard.
 */

export interface DashboardProjectStats {
  total: number
  active: number
  completed: number
}

export default class OrganizationProjectRepository {
  /**
   * Get project statistics for organization dashboard
   */
  async getProjectStats(organizationId: string): Promise<DashboardProjectStats> {
    const [total, active, completed] = await Promise.all([
      db
        .from('projects')
        .count('* as total')
        .where('organization_id', organizationId)
        .whereNull('deleted_at')
        .first(),
      db
        .from('projects')
        .count('* as total')
        .where('organization_id', organizationId)
        .where('status', 'in_progress')
        .whereNull('deleted_at')
        .first(),
      db
        .from('projects')
        .count('* as total')
        .where('organization_id', organizationId)
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
