import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { findApprovedOrgMembership, type OrgMembershipInfo } from './shared.js'
import { isSystemSuperadmin } from './system_scope.js'

import { getOrgRoleLevel, hasOrgPermission, ORG_ROLE_PERMISSIONS } from '#constants/permissions'
import type { DatabaseId } from '#types/database'

export async function getOrgMembership(
  userId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<OrgMembershipInfo | null> {
  const membership = await findApprovedOrgMembership(userId, organizationId, trx)

  if (!membership) return null

  return {
    org_role: membership.org_role,
    permissions: [...(ORG_ROLE_PERMISSIONS[membership.org_role] ?? [])],
  }
}

export async function isOrgOwner(
  userId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const membership = await getOrgMembership(userId, organizationId, trx)
  return membership?.org_role === 'org_owner'
}

export async function isOrgAdminOrOwner(
  userId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const membership = await getOrgMembership(userId, organizationId, trx)
  if (membership) {
    return membership.org_role === 'org_owner' || membership.org_role === 'org_admin'
  }

  return isSystemSuperadmin(userId, trx)
}

export async function getUserOrgRoleLevel(
  userId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number> {
  const membership = await getOrgMembership(userId, organizationId, trx)
  if (!membership) return 0
  return getOrgRoleLevel(membership.org_role)
}

export async function checkOrgPermission(
  userId: DatabaseId,
  organizationId: DatabaseId,
  permission: string,
  trx?: TransactionClientContract
): Promise<boolean> {
  const membership = await getOrgMembership(userId, organizationId, trx)
  if (membership) {
    return hasOrgPermission(membership.org_role, permission)
  }

  return isSystemSuperadmin(userId, trx)
}
