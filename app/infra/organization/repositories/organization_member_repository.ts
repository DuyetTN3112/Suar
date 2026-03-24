import db from '@adonisjs/lucid/services/db'

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
    if (filters.search) {
      query = query.where((q) => {
        q.where('users.username', 'ilike', `%${filters.search}%`).orWhere(
          'users.email',
          'ilike',
          `%${filters.search}%`
        )
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
    const countResult = await countQuery.first()
    const total = Number(countResult?.total || 0)

    // Paginate
    const offset = (page - 1) * perPage
    const data = await query.limit(perPage).offset(offset)

    return {
      members: data.map((row: any) => ({
        user_id: row.user_id,
        username: row.username,
        email: row.email,
        org_role: row.org_role,
        status: row.status,
        invited_by: row.invited_by,
        created_at: new Date(row.created_at),
      })),
      total,
    }
  }

  /**
   * Get member statistics for organization dashboard
   */
  async getMemberStats(organizationId: string): Promise<DashboardMemberStats> {
    const [total, byRole, pending] = await Promise.all([
      db
        .from('organization_users')
        .count('* as total')
        .where('organization_id', organizationId)
        .where('status', 'approved')
        .first(),
      db
        .from('organization_users')
        .select('org_role')
        .count('* as count')
        .where('organization_id', organizationId)
        .where('status', 'approved')
        .groupBy('org_role'),
      db
        .from('organization_users')
        .count('* as total')
        .where('organization_id', organizationId)
        .where('status', 'pending')
        .first(),
    ])

    // Build role counts
    const roleCounts = { org_owner: 0, org_admin: 0, org_member: 0 }
    for (const row of byRole) {
      if (row.org_role in roleCounts) {
        roleCounts[row.org_role as keyof typeof roleCounts] = Number(row.count)
      }
    }

    return {
      total: Number(total?.total || 0),
      byRole: roleCounts,
      pendingInvitations: Number(pending?.total || 0),
    }
  }
}
