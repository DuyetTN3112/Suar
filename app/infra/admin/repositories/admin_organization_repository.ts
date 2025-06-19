import Organization from '#models/organization'
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
      .preload('owner', (q) => {
        void q.select('id', 'username', 'email')
      })
      .withCount('users')
      .withCount('projects')

    // Apply filters
    const search = filters.search
    if (search) {
      void query.where((q) => {
        void q.where('name', 'ilike', `%${search}%`).orWhere('slug', 'ilike', `%${search}%`)
      })
    }

    if (filters.plan) {
      void query.where('plan', filters.plan)
    }

    if (filters.partnerType) {
      void query.where('partner_type', filters.partnerType)
    }

    // Order by created_at DESC
    void query.orderBy('created_at', 'desc')

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

    const statsResults = (await Promise.all([
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
    ])) as unknown[]

    const total = statsResults[0]
    const byPlanRaw = statsResults[1]
    const newThisMonth = statsResults[2]
    const byPlan = Array.isArray(byPlanRaw) ? byPlanRaw : []

    // Build plan counts
    const planCounts = { free: 0, starter: 0, professional: 0, enterprise: 0 }
    for (const rowRaw of byPlan) {
      if (!isRecord(rowRaw)) {
        continue
      }

      const plan = rowRaw.plan
      const count = rowRaw.count
      if (typeof plan === 'string' && plan in planCounts) {
        planCounts[plan as keyof typeof planCounts] = toNumberValue(count)
      }
    }

    return {
      total: isRecord(total) ? toNumberValue(total.total) : 0,
      byPlan: planCounts,
      newThisMonth: isRecord(newThisMonth) ? toNumberValue(newThisMonth.total) : 0,
    }
  }

  /**
   * Find organization by ID with relations
   */
  async findById(orgId: string): Promise<Organization | null> {
    return await Organization.query()
      .where('id', orgId)
      .preload('owner', (q) => {
        void q.select('id', 'username', 'email')
      })
      .withCount('users')
      .withCount('projects')
      .first()
  }
}
