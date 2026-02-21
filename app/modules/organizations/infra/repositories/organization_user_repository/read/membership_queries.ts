import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { baseQuery } from './shared.js'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import type { MembershipContext } from '#modules/organizations/domain/org_types'
import { toOrgRole } from '#modules/organizations/domain/org_types'
import type OrganizationUser from '#modules/organizations/infra/models/organization_user'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'


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
