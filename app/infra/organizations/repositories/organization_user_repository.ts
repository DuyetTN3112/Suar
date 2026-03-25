import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import db from '@adonisjs/lucid/services/db'
import OrganizationUser from '#models/organization_user'

interface CountResultRow {
  count?: number | string
}

interface PaginatedMemberRow {
  user_id: string
  org_role: string
  status: string
  created_at: Date | string
  username: string
  email: string | null
  user_status: string
}

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
 * OrganizationUserRepository
 *
 * Data access for organization membership (CRUD, role checks, pagination).
 * Extracted from OrganizationUser model static methods.
 *
 * Consolidated duplicates:
 * - isMember/hasMembership → isMember (any status)
 * - isOrgAdminOrOwner/isAdminOrOwnerByRoleId → isAdminOrOwner
 * - getMemberRoleName/getOrgRole → getMemberRoleName
 */
export default class OrganizationUserRepository {
  protected instanceType(): 'organization_user_repository' {
    return 'organization_user_repository'
  }

  static async findMembership(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    return query.where('organization_id', organizationId).where('user_id', userId).first()
  }

  static async findMembershipOrFail(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    return query.where('organization_id', organizationId).where('user_id', userId).firstOrFail()
  }

  static async isApprovedMember(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const membership = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', 'approved')
      .first()
    return !!membership
  }

  /**
   * Consolidated: isOrgAdminOrOwner + isAdminOrOwnerByRoleId
   * Checks if user is an approved admin or owner in the organization.
   * @param requireApproved If false, skips status check (replaces isAdminOrOwnerByRoleId)
   */
  static async isAdminOrOwner(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract,
    requireApproved: boolean = true
  ): Promise<boolean> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const q = query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .whereIn('org_role', [OrganizationRole.OWNER, OrganizationRole.ADMIN])

    if (requireApproved) {
      void q.where('status', 'approved')
    }

    const membership = await q.first()
    return !!membership
  }

  static async validateAllApprovedMembers(
    userIds: DatabaseId[],
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    if (userIds.length === 0) return true
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const members = await query
      .whereIn('user_id', userIds)
      .where('organization_id', organizationId)
      .where('status', 'approved')
      .select('user_id')
    return members.length === userIds.length
  }

  static async findApprovedMemberOrFail(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const membership = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', 'approved')
      .first()
    if (!membership) {
      const mod = await import('#exceptions/business_logic_exception')
      throw new mod.default('Thành viên không thuộc tổ chức hoặc chưa được duyệt')
    }
    return membership
  }

  /**
   * Consolidated: isMember + hasMembership
   * Checks if user has any membership record (regardless of status).
   */
  static async isMember(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const membership = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .first()
    return !!membership
  }

  static async updateRole(
    organizationId: DatabaseId,
    userId: DatabaseId,
    orgRole: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .update({ org_role: orgRole, updated_at: new Date() })
  }

  /**
   * Consolidated: getMemberRoleName + getOrgRole
   * Returns org_role. If approvedOnly=true, only returns role for approved members.
   */
  static async getMemberRoleName(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract,
    approvedOnly: boolean = true
  ): Promise<string | null> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const q = query.where('organization_id', organizationId).where('user_id', userId)

    if (approvedOnly) {
      void q.where('status', 'approved')
    }

    const membership = await q.first()
    return membership?.org_role ?? null
  }

  static async deleteMember(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    await query.where('organization_id', organizationId).where('user_id', userId).delete()
  }

  static async updateStatus(
    organizationId: DatabaseId,
    userId: DatabaseId,
    status: 'pending' | 'approved' | 'rejected',
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const result = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .update({ status, updated_at: new Date() })
    return Array.isArray(result) ? result.length : Number(result)
  }

  static async countMembers(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const result = await query.where('organization_id', organizationId).count('* as total')
    const first = result[0]
    if (!first) {
      return 0
    }

    const extras = first.$extras as Record<string, unknown>
    return toNumberValue(extras.total)
  }

  static async getMembersPreview(
    organizationId: DatabaseId,
    limit: number,
    trx?: TransactionClientContract
  ): Promise<OrganizationUser[]> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    return query
      .where('organization_id', organizationId)
      .preload('user', (q) => {
        void q.select(['id', 'email'])
      })
      .orderByRaw(
        `CASE org_role WHEN '${OrganizationRole.OWNER}' THEN 1 WHEN '${OrganizationRole.ADMIN}' THEN 2 ELSE 3 END ASC`
      )
      .limit(limit)
  }

  static async countMembersByOrgIds(
    orgIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    if (orgIds.length === 0) return new Map()
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const results = await query
      .whereIn('organization_id', orgIds)
      .select('organization_id')
      .count('* as total')
      .groupBy('organization_id')
    const map = new Map<string, number>()
    for (const row of results) {
      const extras = row.$extras as Record<string, unknown>
      map.set(row.organization_id, toNumberValue(extras.total))
    }
    return map
  }

  static async addMember(
    data: {
      organization_id: DatabaseId
      user_id: DatabaseId
      org_role: string
      status?: OrganizationUserStatus
    },
    trx?: TransactionClientContract
  ): Promise<OrganizationUser> {
    return OrganizationUser.create(
      {
        organization_id: data.organization_id,
        user_id: data.user_id,
        org_role: data.org_role,
        status: data.status ?? OrganizationUserStatus.APPROVED,
      },
      trx ? { client: trx } : undefined
    )
  }

  static async paginateMembers(
    organizationId: DatabaseId,
    options: {
      page: number
      limit: number
      orgRole?: string
      search?: string
    },
    trx?: TransactionClientContract
  ): Promise<{
    data: Array<{
      user_id: string
      org_role: string
      status: string
      created_at: Date | string
      user: {
        id: string
        username: string
        email: string | null
        status: string
      }
    }>
    total: number
  }> {
    const baseDb = trx ?? db

    const query = baseDb
      .from('organization_users as ou')
      .where('ou.organization_id', organizationId)
      .join('users as u', 'ou.user_id', 'u.id')
      .select(
        'ou.user_id',
        'ou.org_role',
        'ou.status',
        'ou.created_at',
        'u.username',
        'u.email',
        'u.status as user_status'
      )

    if (options.orgRole) {
      void query.where('ou.org_role', options.orgRole)
    }

    if (options.search) {
      const searchTerm = options.search
      void query.where((searchQuery) => {
        void searchQuery
          .whereILike('u.username', `%${searchTerm}%`)
          .orWhereILike('u.email', `%${searchTerm}%`)
      })
    }

    const countQuery = query.clone()
    const countResultRaw = (await countQuery.count('* as count')) as unknown
    const countResult = Array.isArray(countResultRaw) ? countResultRaw : []
    const total = isRecord(countResult[0])
      ? toNumberValue((countResult[0] as CountResultRow).count)
      : 0

    const offset = (options.page - 1) * options.limit
    void query
      .orderByRaw(
        `CASE ou.org_role WHEN '${OrganizationRole.OWNER}' THEN 1 WHEN '${OrganizationRole.ADMIN}' THEN 2 ELSE 3 END ASC`
      )
      .limit(options.limit)
      .offset(offset)

    const members = await query
    const safeMembers = Array.isArray(members) ? members : []

    return {
      data: safeMembers
        .filter((member): member is PaginatedMemberRow => isRecord(member))
        .map((member) => ({
          user_id: member.user_id,
          org_role: member.org_role,
          status: member.status,
          created_at: member.created_at,
          user: {
            id: member.user_id,
            username: member.username,
            email: member.email,
            status: member.user_status,
          },
        })),
      total,
    }
  }

  static async findPendingMembership(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationUser | null> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    return query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', OrganizationUserStatus.PENDING)
      .first()
  }

  static async findMembershipsByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationUser[]> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    return query.where('user_id', userId).select('organization_id', 'status')
  }

  static async findMembersWithUser(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationUser[]> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    return query
      .where('organization_id', organizationId)
      .preload('user')
      .orderBy('created_at', 'asc')
  }

  static async findMembersWithUserProfile(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationUser[]> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    return query.where('organization_id', organizationId).preload('user', (q) => {
      void q.select(['id', 'username', 'email']).whereNull('deleted_at')
    })
  }

  static async findPendingMembersWithDetails(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationUser[]> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    return query
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.PENDING)
      .preload('user', (q) => {
        void q.select(['id', 'username', 'email'])
      })
      .preload('organization', (q) => {
        void q.select(['id', 'name'])
      })
      .orderBy('created_at', 'desc')
  }

  static async findOwnerMembershipIds(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<DatabaseId[]> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const memberships = await query
      .where('user_id', userId)
      .where('org_role', OrganizationRole.OWNER)
      .where('status', OrganizationUserStatus.APPROVED)
      .select('organization_id')
    return memberships.map((m) => m.organization_id)
  }

  static async findMembersExcludingUser(
    organizationId: DatabaseId,
    excludeUserId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationUser[]> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    return query
      .where('organization_id', organizationId)
      .whereNot('user_id', excludeUserId)
      .preload('user')
  }

  static async findPendingMembershipsWithUserInfo(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationUser[]> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    return query
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.PENDING)
      .preload('user', (q) => {
        void q
          .select(['id', 'email', 'username', 'system_role', 'status', 'created_at', 'avatar_url'])
          .whereNull('deleted_at')
      })
  }

  static async countPendingMembers(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const count = await query
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.PENDING)
      .count('user_id as count')
      .first()
    if (!count) {
      return 0
    }

    const extras = count.$extras as Record<string, unknown>
    return toNumberValue(extras.count)
  }
}
