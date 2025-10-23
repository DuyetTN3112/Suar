import db from '@adonisjs/lucid/services/db'

import type { PartnerType } from '#constants/organization_constants'
import Organization from '#infra/organizations/models/organization'

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

export interface ListOrganizationsFilters {
  search?: string
  partnerType?: PartnerType
}

export interface ListOrganizationsResult {
  organizations: Organization[]
  total: number
}

export interface DashboardOrganizationStats {
  total: number
  newThisMonth: number
}

export const AdminOrganizationReadOps = {
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

    const search = filters.search
    if (search) {
      void query.where((q) => {
        void q.where('name', 'ilike', `%${search}%`).orWhere('slug', 'ilike', `%${search}%`)
      })
    }

    if (filters.partnerType) {
      void query.where('partner_type', filters.partnerType)
    }

    void query.orderBy('created_at', 'desc')
    const result = await query.paginate(page, perPage)

    return {
      organizations: result.all(),
      total: result.total,
    }
  },

  async getOrganizationStats(): Promise<DashboardOrganizationStats> {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const statsResults = (await Promise.all([
      db.from('organizations').count('* as total').whereNull('deleted_at').first(),
      db
        .from('organizations')
        .count('* as total')
        .where('created_at', '>=', firstDayOfMonth)
        .whereNull('deleted_at')
        .first(),
    ])) as unknown[]

    const total = statsResults[0]
    const newThisMonth = statsResults[1]

    return {
      total: isRecord(total) ? toNumberValue(total.total) : 0,
      newThisMonth: isRecord(newThisMonth) ? toNumberValue(newThisMonth.total) : 0,
    }
  },

  async findById(orgId: string): Promise<Organization | null> {
    return await Organization.query()
      .where('id', orgId)
      .preload('owner', (q) => {
        void q.select('id', 'username', 'email')
      })
      .withCount('users')
      .withCount('projects')
      .first()
  },
}
