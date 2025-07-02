import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import db from '@adonisjs/lucid/services/db'
import type OrganizationUser from '#models/organization_user'
import {
  baseQuery,
  isRecord,
  toNumberValue,
  type CountResultRow,
  type PaginatedMemberRow,
} from './shared.js'

export const countMembers = async (
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number> => {
  const result = await baseQuery(trx).where('organization_id', organizationId).count('* as total')
  const first = result[0]
  if (!first) {
    return 0
  }

  const extras = first.$extras as Record<string, unknown>
  return toNumberValue(extras.total)
}

export const getMembersPreview = async (
  organizationId: DatabaseId,
  limit: number,
  trx?: TransactionClientContract
): Promise<OrganizationUser[]> => {
  return baseQuery(trx)
    .where('organization_id', organizationId)
    .preload('user', (query) => {
      void query.select(['id', 'email'])
    })
    .orderByRaw(
      `CASE org_role WHEN '${OrganizationRole.OWNER}' THEN 1 WHEN '${OrganizationRole.ADMIN}' THEN 2 ELSE 3 END ASC`
    )
    .limit(limit)
}

export const countMembersByOrgIds = async (
  orgIds: DatabaseId[],
  trx?: TransactionClientContract
): Promise<Map<string, number>> => {
  if (orgIds.length === 0) {
    return new Map()
  }

  const results = await baseQuery(trx)
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

export const paginateMembers = async (
  organizationId: DatabaseId,
  options: {
    page: number
    limit: number
    orgRole?: string
    search?: string
    statusFilter?: string
    include?: Array<'activity' | 'audit'>
  },
  trx?: TransactionClientContract
): Promise<{
  data: Array<{
    user_id: string
    org_role: string
    status: string
    created_at: Date | string
    last_activity_at?: Date | string | null
    user: {
      id: string
      username: string
      email: string | null
      status: string
    }
  }>
  total: number
}> => {
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

  if (options.statusFilter) {
    void query.where('ou.status', options.statusFilter)
  }

  if (options.include?.includes('activity')) {
    void query.select('u.updated_at as last_activity_at')
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
        last_activity_at: (member as unknown as Record<string, unknown>).last_activity_at as
          | Date
          | string
          | null
          | undefined,
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

export const findMembersWithUser = async (
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<OrganizationUser[]> => {
  return baseQuery(trx)
    .where('organization_id', organizationId)
    .preload('user')
    .orderBy('created_at', 'asc')
}

export const findMembersWithUserProfile = async (
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<OrganizationUser[]> => {
  return baseQuery(trx)
    .where('organization_id', organizationId)
    .preload('user', (query) => {
      void query.select(['id', 'username', 'email']).whereNull('deleted_at')
    })
}

export const findPendingMembersWithDetails = async (
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<OrganizationUser[]> => {
  return baseQuery(trx)
    .where('organization_id', organizationId)
    .where('status', OrganizationUserStatus.PENDING)
    .preload('user', (query) => {
      void query.select(['id', 'username', 'email'])
    })
    .preload('organization', (query) => {
      void query.select(['id', 'name'])
    })
    .orderBy('created_at', 'desc')
}

export const findMembersExcludingUser = async (
  organizationId: DatabaseId,
  excludeUserId: DatabaseId,
  trx?: TransactionClientContract
): Promise<OrganizationUser[]> => {
  return baseQuery(trx)
    .where('organization_id', organizationId)
    .whereNot('user_id', excludeUserId)
    .preload('user')
}

export const findPendingMembershipsWithUserInfo = async (
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<OrganizationUser[]> => {
  return baseQuery(trx)
    .where('organization_id', organizationId)
    .where('status', OrganizationUserStatus.PENDING)
    .preload('user', (query) => {
      void query
        .select(['id', 'email', 'username', 'system_role', 'status', 'created_at', 'avatar_url'])
        .whereNull('deleted_at')
    })
}

export const countPendingMembers = async (
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number> => {
  const count = await baseQuery(trx)
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
