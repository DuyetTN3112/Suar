import db from '@adonisjs/lucid/services/db'

interface CountRow {
  total: number | string
}

interface RoleCountRow {
  org_role: string
  count: number | string
}

const isRoleCountRow = (value: unknown): value is RoleCountRow => {
  if (!isRecord(value)) {
    return false
  }

  const orgRole = value.org_role
  const count = value.count
  return typeof orgRole === 'string' && (typeof count === 'number' || typeof count === 'string')
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toStringValue = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

const toNullableString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null
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

const toDateValue = (value: unknown): Date => {
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'string') {
    return new Date(value)
  }
  return new Date(0)
}

/**
 * OrganizationMemberRepository (Infrastructure Layer)
 *
 * Handles database queries for organization members.
 */

export interface ListMembersFilters {
  search?: string
  orgRole?: string
  status?: string
}

export interface OrganizationMember {
  user_id: string
  username: string
  email: string | null
  org_role: string
  status: string
  invited_by: string | null
  created_at: Date
}

export interface ListMembersResult {
  members: OrganizationMember[]
  total: number
}

export interface DashboardMemberStats {
  total: number
  byRole: {
    org_owner: number
    org_admin: number
    org_member: number
  }
  pendingInvitations: number
}

export default class OrganizationMemberRepository {
  /**
   * List organization members with filters and pagination
   */
  async listMembers(
    organizationId: string,
    filters: ListMembersFilters,
    page: number,
    perPage: number
  ): Promise<ListMembersResult> {
    let query = db
      .from('organization_users')
      .innerJoin('users', 'organization_users.user_id', 'users.id')
      .where('organization_users.organization_id', organizationId)
      .select(
        'users.id as user_id',
        'users.username',
        'users.email',
        'organization_users.org_role',
        'organization_users.status',
        'organization_users.invited_by',
        'organization_users.created_at'
      )

    // Apply filters
    const search = filters.search
    if (search) {
      query = query.where((q) => {
        void q
          .where('users.username', 'ilike', `%${search}%`)
          .orWhere('users.email', 'ilike', `%${search}%`)
      })
    }

    if (filters.orgRole) {
      query = query.where('organization_users.org_role', filters.orgRole)
    }

    if (filters.status) {
      query = query.where('organization_users.status', filters.status)
    }

    // Order by created_at DESC
    query = query.orderBy('organization_users.created_at', 'desc')

    // Count total
    const countQuery = query.clone().clearSelect().clearOrder().count('* as total')
    const countResult = (await countQuery.first()) as unknown
    const total = isRecord(countResult) ? toNumberValue(countResult.total) : 0

    // Paginate
    const offset = (page - 1) * perPage
    const dataRaw = (await query.limit(perPage).offset(offset)) as unknown
    const data = Array.isArray(dataRaw) ? dataRaw : []

    return {
      members: data.filter(isRecord).map((row) => ({
        user_id: toStringValue(row.user_id),
        username: toStringValue(row.username),
        email: toNullableString(row.email),
        org_role: toStringValue(row.org_role),
        status: toStringValue(row.status),
        invited_by: toNullableString(row.invited_by),
        created_at: toDateValue(row.created_at),
      })),
      total,
    }
  }

  /**
   * Get member statistics for organization dashboard
   */
  async getMemberStats(organizationId: string): Promise<DashboardMemberStats> {
    const totalRaw: unknown = await db
      .from('organization_users')
      .count('* as total')
      .where('organization_id', organizationId)
      .where('status', 'approved')
      .first()

    const byRoleRaw: unknown = await db
      .from('organization_users')
      .select('org_role')
      .count('* as count')
      .where('organization_id', organizationId)
      .where('status', 'approved')
      .groupBy('org_role')

    const pendingRaw: unknown = await db
      .from('organization_users')
      .count('* as total')
      .where('organization_id', organizationId)
      .where('status', 'pending')
      .first()

    const byRole = (Array.isArray(byRoleRaw) ? byRoleRaw : []) as unknown[]
    const total = (isRecord(totalRaw) ? totalRaw : null) as CountRow | null
    const pending = (isRecord(pendingRaw) ? pendingRaw : null) as CountRow | null

    // Build role counts
    const roleCounts = { org_owner: 0, org_admin: 0, org_member: 0 }
    for (const rowRaw of byRole) {
      if (!isRoleCountRow(rowRaw)) {
        continue
      }

      const row = rowRaw
      if (row.org_role in roleCounts) {
        roleCounts[row.org_role as keyof typeof roleCounts] = toNumberValue(row.count)
      }
    }

    return {
      total: toNumberValue(total?.total),
      byRole: roleCounts,
      pendingInvitations: toNumberValue(pending?.total),
    }
  }
}
