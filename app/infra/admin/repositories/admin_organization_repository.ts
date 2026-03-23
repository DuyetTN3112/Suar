import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

/**
 * AdminOrganizationRepository (Infrastructure Layer)
 *
 * Handles all database queries for admin organization management.
 */

export interface ListOrganizationsFilters {
  search?: string
  plan?: string
  partnerType?: string
}

export interface ListOrganizationsResult {
  organizations: Organization[]
  total: number
}

export interface DashboardOrganizationStats {
  total: number
  byPlan: {
    free: number
    starter: number
    professional: number
    enterprise: number
  }
  newThisMonth: number
}

export default class AdminOrganizationRepository {
  /**
   * List organizations with filters and pagination
   */
  async listOrganizations(
    filters: ListOrganizationsFilters,
    page: number,
    perPage: number
  ): Promise<ListOrganizationsResult> {
    const query = Organization.query()

    // Apply filters
    if (filters.search) {
      query.where((q) => {
        q.where('name', 'ilike', `%${filters.search}%`).orWhere(
          'slug',
          'ilike',
          `%${filters.search}%`
        )
      })
    }

    if (filters.plan) {
      query.where('plan', filters.plan)
    }

    if (filters.partnerType) {
      query.where('partner_type', filters.partnerType)
    }

    // Order by created_at DESC
    query.orderBy('created_at', 'desc')

    // Execute with pagination
    const result = await query.paginate(page, perPage)

    return {
      organizations: result.all(),
      total: result.total,
    }
  }

  /**
   * Get organization statistics for dashboard
   */
  async getOrganizationStats(): Promise<DashboardOrganizationStats> {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, byPlan, newThisMonth] = await Promise.all([
      db.from('organizations').count('* as total').whereNull('deleted_at').first(),
      db
        .from('organizations')
        .select('plan')
        .count('* as count')
        .whereNull('deleted_at')
        .groupBy('plan'),
      db
        .from('organizations')
        .count('* as total')
        .where('created_at', '>=', firstDayOfMonth)
        .whereNull('deleted_at')
        .first(),
    ])

    // Build plan counts
    const planCounts = { free: 0, starter: 0, professional: 0, enterprise: 0 }
    for (const row of byPlan) {
      if (row.plan in planCounts) {
        planCounts[row.plan as keyof typeof planCounts] = Number(row.count)
      }
    }

    return {
      total: Number(total?.total || 0),
      byPlan: planCounts,
      newThisMonth: Number(newThisMonth?.total || 0),
    }
  }
}
