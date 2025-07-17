import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { baseQuery } from './shared.js'

import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import type { MembershipContext } from '#domain/organizations/org_types'
import { toOrgRole } from '#domain/organizations/org_types'
import BusinessLogicException from '#exceptions/business_logic_exception'
import type OrganizationUser from '#models/organization_user'
import type { DatabaseId } from '#types/database'


export const findMembership = async (
  organizationId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
) => {
  return baseQuery(trx).where('organization_id', organizationId).where('user_id', userId).first()
}

export const findApprovedMembershipWithOrganization = async (
  organizationId: DatabaseId,
  userId: DatabaseId,
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

export const listMembershipsByUser = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
) => {
  return baseQuery(trx).where('user_id', userId)
}

export const findPendingMembership = async (
  organizationId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<OrganizationUser | null> => {
  return baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .where('status', OrganizationUserStatus.PENDING)
    .first()
}

export const findMembershipOrFail = async (
  organizationId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
) => {
  return baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .firstOrFail()
}

export const isApprovedMember = async (
  userId: DatabaseId,
  organizationId: DatabaseId,
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
  userId: DatabaseId,
  organizationId: DatabaseId,
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
  userIds: DatabaseId[],
  organizationId: DatabaseId,
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
  organizationId: DatabaseId,
  userId: DatabaseId,
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
  userId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const membership = await baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .first()
  return !!membership
}

export const getMembershipContext = async (
  organizationId: DatabaseId,
  userId: DatabaseId,
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
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<OrganizationUser[]> => {
  return baseQuery(trx).where('user_id', userId).select('organization_id', 'status')
}

export const findFirstApprovedMembershipWithOrganization = async (
  userId: DatabaseId,
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

export const findOwnerMembershipIds = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<DatabaseId[]> => {
  const memberships = await baseQuery(trx)
    .where('user_id', userId)
    .where('org_role', OrganizationRole.OWNER)
    .where('status', OrganizationUserStatus.APPROVED)
    .select('organization_id')

  return memberships.map((membership) => membership.organization_id)
}
