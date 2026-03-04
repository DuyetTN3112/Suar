import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  toProjectionDateTime,
  type OrganizationInvitationProjection,
  type UserOrganizationMembershipSummaryProjection,
} from './membership_read_projections.js'
import { baseQuery } from './query_helpers.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import type { MembershipContext } from '#modules/organizations/access/domain/org_types'
import { toOrgRole } from '#modules/organizations/access/domain/org_types'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/members/actions/dtos/common/organization_pagination'
import type OrganizationUser from '#modules/organizations/members/infra/models/organization_user'
import {
  buildPaginationMeta,
  normalizePagination,
  toOffset,
} from '#modules/pagination/public_contracts/pagination_public_api'

interface PendingInvitationRow {
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

function pendingInvitationsQuery(userId: string, trx?: TransactionClientContract) {
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

function toInvitationProjection(row: PendingInvitationRow): OrganizationInvitationProjection {
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

export const findMembership = async (
  organizationId: string,
  userId: string,
  trx?: TransactionClientContract
) => {
  return baseQuery(trx).where('organization_id', organizationId).where('user_id', userId).first()
}

/** @deprecated Use findApprovedMembershipContext unless the caller needs the loaded organization model. */
export const findApprovedMembershipWithOrganization = async (
  organizationId: string,
  userId: string,
  trx?: TransactionClientContract
) => {
  return baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .where('status', OrganizationUserStatus.APPROVED)
    .whereHas('organization', (orgQuery) => {
      void orgQuery.whereNull('deleted_at')
    })
    .preload('organization', (orgQuery) => {
      void orgQuery.whereNull('deleted_at')
    })
    .first()
}

export const findApprovedMembershipContext = async (
  organizationId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<MembershipContext> => {
  const membership = await baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .where('status', OrganizationUserStatus.APPROVED)
    .whereHas('organization', (orgQuery) => {
      void orgQuery.whereNull('deleted_at')
    })
    .first()

  const role = toOrgRole(membership?.org_role)
  if (!membership || !role) {
    return null
  }

  return {
    userId,
    organizationId,
    role,
  }
}

export const listMembershipsByUser = async (
  userId: string,
  trx?: TransactionClientContract
) => {
  return baseQuery(trx).where('user_id', userId)
}

export const listMemberUserIds = async (
  organizationId: string,
  status?: string | null,
  trx?: TransactionClientContract
): Promise<string[]> => {
  const query = baseQuery(trx)
    .where('organization_id', organizationId)
    .select('user_id')

  if (status) {
    void query.where('status', status)
  }

  const memberships = await query
  return memberships.map((membership) => membership.user_id)
}

export const listOrganizationSummariesByUser = async (
  userId: string,
  options: { approvedOnly?: boolean } = {},
  trx?: TransactionClientContract
): Promise<UserOrganizationMembershipSummaryProjection[]> => {
  const query = (trx ?? db)
    .from('organization_users as ou')
    .join('organizations as o', 'o.id', 'ou.organization_id')
    .where('ou.user_id', userId)
    .whereNull('o.deleted_at')
    .select(
      'o.id',
      'o.name',
      'o.slug',
      'o.logo',
      'ou.org_role',
      'ou.status',
      'ou.invited_by'
    )
    .orderBy('ou.created_at', 'asc')

  if (options.approvedOnly) {
    void query.where('ou.status', OrganizationUserStatus.APPROVED)
  }

  return (await query) as UserOrganizationMembershipSummaryProjection[]
}

export const findPendingMembership = async (
  organizationId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<OrganizationUser | null> => {
  return baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .where('status', OrganizationUserStatus.PENDING)
    .first()
}

export const findMembershipOrFail = async (
  organizationId: string,
  userId: string,
  trx?: TransactionClientContract
) => {
  return baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .firstOrFail()
}

export const isApprovedMember = async (
  userId: string,
  organizationId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const membership = await baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .where('status', OrganizationUserStatus.APPROVED)
    .first()
  return !!membership
}

export const isAdminOrOwner = async (
  userId: string,
  organizationId: string,
  trx?: TransactionClientContract,
  requireApproved = true
): Promise<boolean> => {
  const query = baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .whereIn('org_role', [OrganizationRole.OWNER, OrganizationRole.ADMIN])

  if (requireApproved) {
    void query.where('status', OrganizationUserStatus.APPROVED)
  }

  const membership = await query.first()
  return !!membership
}

export const validateAllApprovedMembers = async (
  userIds: string[],
  organizationId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  if (userIds.length === 0) {
    return true
  }

  const members = await baseQuery(trx)
    .whereIn('user_id', userIds)
    .where('organization_id', organizationId)
    .where('status', OrganizationUserStatus.APPROVED)
    .select('user_id')

  return members.length === userIds.length
}

export const findApprovedMemberOrFail = async (
  organizationId: string,
  userId: string,
  trx?: TransactionClientContract
) => {
  const membership = await baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .where('status', OrganizationUserStatus.APPROVED)
    .first()

  if (!membership) {
    throw new BusinessLogicException('Thành viên không thuộc tổ chức hoặc chưa được duyệt')
  }

  return membership
}

export const isMember = async (
  userId: string,
  organizationId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const membership = await baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .first()
  return !!membership
}

export const getMembershipContext = async (
  organizationId: string,
  userId: string,
  trx?: TransactionClientContract,
  approvedOnly = true
): Promise<MembershipContext> => {
  const query = baseQuery(trx).where('organization_id', organizationId).where('user_id', userId)

  if (approvedOnly) {
    void query.where('status', OrganizationUserStatus.APPROVED)
  }

  const membership = await query.first()
  const role = toOrgRole(membership?.org_role)
  if (!role) {
    return null
  }

  return {
    userId,
    organizationId,
    role,
  }
}

export const findMembershipsByUser = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<OrganizationUser[]> => {
  return baseQuery(trx).where('user_id', userId).select('organization_id', 'status')
}

/** @deprecated Use findFirstApprovedMembershipContext unless the caller needs the legacy row shape. */
export const findFirstApprovedMembershipWithOrganization = async (
  userId: string,
  trx?: TransactionClientContract
) => {
  return baseQuery(trx)
    .where('user_id', userId)
    .where('status', OrganizationUserStatus.APPROVED)
    .whereHas('organization', (orgQuery) => {
      void orgQuery.whereNull('deleted_at')
    })
    .orderBy('created_at', 'asc')
    .first()
}

export const findFirstApprovedMembershipContext = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<MembershipContext> => {
  const membership = await baseQuery(trx)
    .where('user_id', userId)
    .where('status', OrganizationUserStatus.APPROVED)
    .whereHas('organization', (orgQuery) => {
      void orgQuery.whereNull('deleted_at')
    })
    .orderBy('created_at', 'asc')
    .first()

  const role = toOrgRole(membership?.org_role)
  if (!membership || !role) {
    return null
  }

  return {
    userId,
    organizationId: membership.organization_id,
    role,
  }
}

export const findOwnerMembershipIds = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<string[]> => {
  const memberships = await baseQuery(trx)
    .where('user_id', userId)
    .where('org_role', OrganizationRole.OWNER)
    .where('status', OrganizationUserStatus.APPROVED)
    .select('organization_id')

  return memberships.map((membership) => membership.organization_id)
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
