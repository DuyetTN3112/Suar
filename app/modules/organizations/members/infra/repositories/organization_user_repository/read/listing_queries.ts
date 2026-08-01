import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  toProjectionDateTime,
  type OrganizationMembershipWithUserAndOrganizationProjection,
  type OrganizationMembershipWithUserProjection,
} from './membership_read_projections.js'
import {
  baseQuery,
  isRecord,
  toNumberValue,
  type CountResultRow,
  type PaginatedMemberRow,
} from './query_helpers.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'

interface MembershipWithUserRow {
  organization_id: string
  user_id: string
  org_role: string
  membership_status: string
  invited_by: string | null
  membership_created_at: string | Date
  membership_updated_at: string | Date
  identity_id: string
  identity_username: string | null
  identity_email: string | null
  identity_status: string
  identity_system_role: string
  identity_avatar_url: string | null
  identity_created_at: string | Date
}

interface MembershipWithUserAndOrganizationRow extends MembershipWithUserRow {
  organization_name: string
  organization_logo: string | null
}

function memberWithUserQuery(trx?: TransactionClientContract) {
  return (trx ?? db)
    .from('organization_users as ou')
    .join('users as u', 'u.id', 'ou.user_id')
    .select(
      'ou.organization_id',
      'ou.user_id',
      'ou.org_role',
      'ou.status as membership_status',
      'ou.invited_by',
      'ou.created_at as membership_created_at',
      'ou.updated_at as membership_updated_at',
      'u.id as identity_id',
      'u.username as identity_username',
      'u.email as identity_email',
      'u.status as identity_status',
      'u.system_role as identity_system_role',
      'u.avatar_url as identity_avatar_url',
      'u.created_at as identity_created_at'
    )
}

function toMembershipWithUser(
  row: MembershipWithUserRow
): OrganizationMembershipWithUserProjection {
  return {
    organization_id: row.organization_id,
    user_id: row.user_id,
    org_role: row.org_role,
    status: row.membership_status,
    invited_by: row.invited_by,
    created_at: toProjectionDateTime(row.membership_created_at),
    updated_at: toProjectionDateTime(row.membership_updated_at),
    user: {
      id: row.identity_id,
      username: row.identity_username ?? '',
      email: row.identity_email,
      status: row.identity_status,
      system_role: row.identity_system_role,
      avatar_url: row.identity_avatar_url,
      created_at: toProjectionDateTime(row.identity_created_at),
    },
  }
}

export const countMembers = async (
  organizationId: string,
  trx?: TransactionClientContract
): Promise<number> => {
  const result = await baseQuery(trx).where('organization_id', organizationId).count('* as total')
  const first = result[0]
  if (!first) {
    return 0
  }

  const extras = first.$extras as Record<string, unknown>
  return toNumberValue(extras['total'])
}

export const getMembersPreview = async (
  organizationId: string,
  limit: number,
  trx?: TransactionClientContract
): Promise<OrganizationMembershipWithUserProjection[]> => {
  const rows = (await memberWithUserQuery(trx)
    .where('ou.organization_id', organizationId)
    .orderByRaw(
      `CASE ou.org_role WHEN '${OrganizationRole.OWNER}' THEN 1 WHEN '${OrganizationRole.ADMIN}' THEN 2 ELSE 3 END ASC`
    )
    .limit(limit)) as MembershipWithUserRow[]

  return rows.map(toMembershipWithUser)
}

export const countMembersByOrgIds = async (
  orgIds: string[],
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
    map.set(row.organization_id, toNumberValue(extras['total']))
  }
  return map
}

export const paginateMembers = async (
  organizationId: string,
  options: {
    page: number
    limit: number
    orgRole?: string
    userIds?: string[]
    search?: string
    statusFilter?: string
    include?: ('activity' | 'audit')[]
    joinDateStart?: string
    joinDateEnd?: string
  },
  trx?: TransactionClientContract
): Promise<{
  data: {
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
  }[]
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

  if (options.userIds && options.userIds.length > 0) {
    void query.whereIn('ou.user_id', options.userIds)
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

  if (options.joinDateStart) {
    void query.where('ou.created_at', '>=', options.joinDateStart)
  }

  if (options.joinDateEnd) {
    void query.where('ou.created_at', '<=', options.joinDateEnd)
  }

  const countQuery = query.clone().clearSelect().clearOrder()
  const countResultRaw = (await countQuery.count('* as count')) as unknown
  const countResult = Array.isArray(countResultRaw) ? countResultRaw : []
  const total = isRecord(countResult[0])
    ? toNumberValue((countResult[0] as CountResultRow).count)
    : 0

  const offset = (options.page - 1) * options.limit
  if (options.userIds && options.userIds.length > 0) {
    const rankByUserId = options.userIds
      .map((userId, index) => `WHEN ou.user_id = '${userId}' THEN ${String(index)}`)
      .join(' ')
    void query.orderByRaw(`CASE ${rankByUserId} ELSE ${String(options.userIds.length)} END ASC`)
  } else {
    void query.orderByRaw(
      `CASE ou.org_role WHEN '${OrganizationRole.OWNER}' THEN 1 WHEN '${OrganizationRole.ADMIN}' THEN 2 ELSE 3 END ASC`
    )
  }

  void query.orderBy('ou.created_at', 'desc').orderBy('ou.user_id', 'desc').limit(options.limit).offset(offset)

  const members = await query
  const safeMembers = Array.isArray(members) ? members : []

  return {
    data: safeMembers
      .filter((member): member is PaginatedMemberRow => isRecord(member))
      .map((member) =>
        omitUndefined({
          user_id: member.user_id,
          org_role: member.org_role,
          status: member.status,
          created_at: member.created_at,
          last_activity_at: (member as unknown as Record<string, unknown>)['last_activity_at'] as
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
        })
      ),
    total,
  }
}

export const findMembersWithUser = async (
  organizationId: string,
  trx?: TransactionClientContract
): Promise<OrganizationMembershipWithUserProjection[]> => {
  const rows = (await memberWithUserQuery(trx)
    .where('ou.organization_id', organizationId)
    .orderBy('ou.created_at', 'asc')) as MembershipWithUserRow[]

  return rows.map(toMembershipWithUser)
}

export const findMembersWithUserBySearch = async (
  organizationId: string,
  search: string,
  trx?: TransactionClientContract
): Promise<OrganizationMembershipWithUserProjection[]> => {
  const rows = (await memberWithUserQuery(trx)
    .where('ou.organization_id', organizationId)
    .where((query) => {
      void query
        .whereILike('u.username', `%${search}%`)
        .orWhereILike('u.email', `%${search}%`)
    })
    .orderBy('ou.created_at', 'asc')) as MembershipWithUserRow[]

  return rows.map(toMembershipWithUser)
}

export const findMembersWithUserByIds = async (
  organizationId: string,
  userIds: string[],
  trx?: TransactionClientContract
): Promise<OrganizationMembershipWithUserProjection[]> => {
  if (userIds.length === 0) {
    return []
  }

  const rows = (await memberWithUserQuery(trx)
    .where('ou.organization_id', organizationId)
    .whereIn('ou.user_id', userIds)) as MembershipWithUserRow[]

  const rankByUserId = new Map(userIds.map((userId, index) => [userId, index]))
  return rows
    .map(toMembershipWithUser)
    .sort(
      (left, right) =>
        (rankByUserId.get(left.user_id) ?? userIds.length) -
        (rankByUserId.get(right.user_id) ?? userIds.length)
    )
}

export const findMembersWithUserProfile = async (
  organizationId: string,
  trx?: TransactionClientContract
): Promise<OrganizationMembershipWithUserProjection[]> => {
  const rows = (await memberWithUserQuery(trx)
    .where('ou.organization_id', organizationId)
    .whereNull('u.deleted_at')) as MembershipWithUserRow[]

  return rows.map(toMembershipWithUser)
}

export const findPendingMembersWithDetails = async (
  organizationId: string,
  trx?: TransactionClientContract
): Promise<OrganizationMembershipWithUserAndOrganizationProjection[]> => {
  const rows = (await memberWithUserQuery(trx)
    .join('organizations as o', 'o.id', 'ou.organization_id')
    .where('ou.organization_id', organizationId)
    .where('ou.status', OrganizationUserStatus.PENDING)
    .select('o.name as organization_name', 'o.logo as organization_logo')
    .orderBy('ou.created_at', 'desc')) as MembershipWithUserAndOrganizationRow[]

  return rows.map((row) => ({
    ...toMembershipWithUser(row),
    organization: {
      id: row.organization_id,
      name: row.organization_name,
      logo: row.organization_logo,
    },
  }))
}

export const findMembersExcludingUser = async (
  organizationId: string,
  excludeUserId: string,
  trx?: TransactionClientContract
): Promise<OrganizationMembershipWithUserProjection[]> => {
  const rows = (await memberWithUserQuery(trx)
    .where('ou.organization_id', organizationId)
    .whereNot('ou.user_id', excludeUserId)) as MembershipWithUserRow[]

  return rows.map(toMembershipWithUser)
}

export const findPendingMembershipsWithUserInfo = async (
  organizationId: string,
  trx?: TransactionClientContract
): Promise<OrganizationMembershipWithUserProjection[]> => {
  const rows = (await memberWithUserQuery(trx)
    .where('ou.organization_id', organizationId)
    .where('ou.status', OrganizationUserStatus.PENDING)
    .whereNull('u.deleted_at')) as MembershipWithUserRow[]

  return rows.map(toMembershipWithUser)
}

export const countPendingMembers = async (
  organizationId: string,
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
  return toNumberValue(extras['count'])
}
