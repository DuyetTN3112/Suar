import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  toProjectionDateTime,
  type OrganizationInvitationProjection,
} from './membership_read_projections.js'

import { ORGANIZATION_PAGINATION } from '#modules/organizations/actions/dtos/common/members/organization_pagination'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/access/organization_constants'
import {
  buildPaginationMeta,
  normalizePagination,
  toOffset,
} from '#modules/pagination/public_contracts/pagination_public_api'

export interface PendingInvitationRow {
  organization_id: string
  user_id: string
  org_role: string
  membership_status: string
  invited_by: string
  membership_created_at: string | Date
  membership_updated_at: string | Date
  organization_name: string
  organization_logo: string | null
  inviter_id: string
  inviter_username: string | null
  inviter_email: string | null
  inviter_status: string
  inviter_system_role: string
  inviter_avatar_url: string | null
  inviter_created_at: string | Date
}

export function pendingInvitationsQuery(userId: string, trx?: TransactionClientContract) {
  return (trx ?? db)
    .from('organization_users as ou')
    .join('organizations as o', 'o.id', 'ou.organization_id')
    .join('users as inviter', 'inviter.id', 'ou.invited_by')
    .where('ou.user_id', userId)
    .where('ou.status', OrganizationUserStatus.PENDING)
    .whereNotNull('ou.invited_by')
    .select(
      'ou.organization_id',
      'ou.user_id',
      'ou.org_role',
      'ou.status as membership_status',
      'ou.invited_by',
      'ou.created_at as membership_created_at',
      'ou.updated_at as membership_updated_at',
      'o.name as organization_name',
      'o.logo as organization_logo',
      'inviter.id as inviter_id',
      'inviter.username as inviter_username',
      'inviter.email as inviter_email',
      'inviter.status as inviter_status',
      'inviter.system_role as inviter_system_role',
      'inviter.avatar_url as inviter_avatar_url',
      'inviter.created_at as inviter_created_at'
    )
}

export function toInvitationProjection(row: PendingInvitationRow): OrganizationInvitationProjection {
  return {
    organization_id: row.organization_id,
    user_id: row.user_id,
    org_role: row.org_role,
    status: row.membership_status,
    invited_by: row.invited_by,
    created_at: toProjectionDateTime(row.membership_created_at),
    updated_at: toProjectionDateTime(row.membership_updated_at),
    organization: {
      id: row.organization_id,
      name: row.organization_name,
      logo: row.organization_logo,
    },
    inviter: {
      id: row.inviter_id,
      username: row.inviter_username ?? '',
      email: row.inviter_email,
      status: row.inviter_status,
      system_role: row.inviter_system_role,
      avatar_url: row.inviter_avatar_url,
      created_at: toProjectionDateTime(row.inviter_created_at),
    },
  }
}

export const findPendingInvitationsByUser = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<OrganizationInvitationProjection[]> => {
  const rows = (await pendingInvitationsQuery(userId, trx).orderBy(
    'ou.created_at',
    'desc'
  )) as PendingInvitationRow[]

  return rows.map(toInvitationProjection)
}

export const findPendingInvitationsPageByUser = async (
  userId: string,
  input: { page?: unknown; perPage?: unknown } = {},
  trx?: TransactionClientContract
): Promise<{
  data: OrganizationInvitationProjection[]
  meta: ReturnType<typeof buildPaginationMeta>
}> => {
  const pagination = normalizePagination(input, ORGANIZATION_PAGINATION, { perPage: 10 })
  const countQuery = (trx ?? db).from('organization_users')
    .where('user_id', userId)
    .where('status', OrganizationUserStatus.PENDING)
    .whereNotNull('invited_by')

  const totalRow = (await countQuery.count('* as total').first()) as
    | { total?: string | number }
    | undefined
  const total = Number(totalRow?.total ?? 0)
  const rows = (await pendingInvitationsQuery(userId, trx)
    .orderBy('ou.created_at', 'desc')
    .offset(toOffset(pagination.page, pagination.perPage))
    .limit(pagination.perPage)) as PendingInvitationRow[]

  return {
    data: rows.map(toInvitationProjection),
    meta: buildPaginationMeta(total, pagination),
  }
}
