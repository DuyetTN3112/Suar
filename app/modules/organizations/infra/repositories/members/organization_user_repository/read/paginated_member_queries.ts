import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  isRecord,
  toNumberValue,
  type CountResultRow,
  type PaginatedMemberRow,
} from './query_helpers.js'

import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}

export const listMembersPaginated = async (
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
