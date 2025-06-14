/**
 * Permission Helpers
 *
 * Các hàm helper kiểm tra permission trong hệ thống.
 * Tập trung các hàm check permission để tránh duplicate code.
 *
 * v3: org_role is an inline VARCHAR column (no more role_id FK)
 *
 * @module PermissionHelpers
 */

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'

/**
 * Interface cho membership record
 */
interface MembershipRecord {
  id: string
  org_role: string
  status: string
}

/**
 * Kiểm tra user có phải là Owner (superadmin) của organization
 */
export async function isOrganizationOwner(
  userId: string | number,
  organizationId: string | number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const client = trx || db

  const result = (await client
    .from('organization_users')
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .where('org_role', OrganizationRole.OWNER)
    .where('status', OrganizationUserStatus.APPROVED)
    .first()) as MembershipRecord | null

  return !!result
}

/**
 * Kiểm tra user có phải là Owner hoặc Admin của organization
 */
export async function isOrganizationAdminOrOwner(
  userId: string | number,
  organizationId: string | number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const client = trx || db

  const result = (await client
    .from('organization_users')
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .whereIn('org_role', [OrganizationRole.OWNER, OrganizationRole.ADMIN])
    .where('status', OrganizationUserStatus.APPROVED)
    .first()) as MembershipRecord | null

  return !!result
}

/**
 * Kiểm tra user có là approved member của organization
 */
export async function isApprovedOrganizationMember(
  userId: string | number,
  organizationId: string | number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const client = trx || db

  const result = (await client
    .from('organization_users')
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .where('status', OrganizationUserStatus.APPROVED)
    .first()) as MembershipRecord | null

  return !!result
}

/**
 * Lấy org_role của user trong organization
 *
 * @returns org_role string hoặc null nếu không tìm thấy
 */
export async function getOrganizationMemberRole(
  userId: string | number,
  organizationId: string | number,
  trx?: TransactionClientContract
): Promise<string | null> {
  const client = trx || db

  const result = (await client
    .from('organization_users')
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .where('status', OrganizationUserStatus.APPROVED)
    .select('org_role')
    .first()) as { org_role: string } | null

  return result?.org_role ?? null
}

/**
 * Kiểm tra user có quyền quản lý members (Owner or Admin)
 */
export async function canManageOrganizationMembers(
  userId: string | number,
  organizationId: string | number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const client = trx || db

  const result = (await client
    .from('organization_users')
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .whereIn('org_role', [OrganizationRole.OWNER, OrganizationRole.ADMIN])
    .where('status', OrganizationUserStatus.APPROVED)
    .first()) as MembershipRecord | null

  return !!result
}
