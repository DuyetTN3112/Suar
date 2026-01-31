/**
 * Permission Helpers
 *
 * Các hàm helper kiểm tra permission trong hệ thống.
 * Tập trung các hàm check permission để tránh duplicate code.
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
  id: number
  role_id: number
  status: string
}

/**
 * Kiểm tra user có phải là Owner (superadmin) của organization
 *
 * @param userId - ID của user cần kiểm tra
 * @param organizationId - ID của organization
 * @param trx - Transaction client (optional)
 * @returns true nếu user là Owner
 *
 * @example
 * const isOwner = await isOrganizationOwner(userId, orgId)
 */
export async function isOrganizationOwner(
  userId: number,
  organizationId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const client = trx || db

  const result = (await client
    .from('organization_users')
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .where('role_id', OrganizationRole.OWNER)
    .where('status', OrganizationUserStatus.APPROVED)
    .first()) as MembershipRecord | null

  return !!result
}

/**
 * Kiểm tra user có phải là Owner hoặc Admin của organization
 *
 * @param userId - ID của user cần kiểm tra
 * @param organizationId - ID của organization
 * @param trx - Transaction client (optional)
 * @returns true nếu user là Owner hoặc Admin
 *
 * @example
 * const canManage = await isOrganizationAdminOrOwner(userId, orgId)
 */
export async function isOrganizationAdminOrOwner(
  userId: number,
  organizationId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const client = trx || db

  const result = (await client
    .from('organization_users')
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .whereIn('role_id', [OrganizationRole.OWNER, OrganizationRole.ADMIN])
    .where('status', OrganizationUserStatus.APPROVED)
    .first()) as MembershipRecord | null

  return !!result
}

/**
 * Kiểm tra user có là approved member của organization
 *
 * @param userId - ID của user cần kiểm tra
 * @param organizationId - ID của organization
 * @param trx - Transaction client (optional)
 * @returns true nếu user là approved member
 *
 * @example
 * const isMember = await isApprovedOrganizationMember(userId, orgId)
 */
export async function isApprovedOrganizationMember(
  userId: number,
  organizationId: number,
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
 * Lấy role_id của user trong organization
 *
 * @param userId - ID của user
 * @param organizationId - ID của organization
 * @param trx - Transaction client (optional)
 * @returns role_id hoặc null nếu không tìm thấy
 *
 * @example
 * const roleId = await getOrganizationMemberRoleId(userId, orgId)
 */
export async function getOrganizationMemberRoleId(
  userId: number,
  organizationId: number,
  trx?: TransactionClientContract
): Promise<number | null> {
  const client = trx || db

  const result = (await client
    .from('organization_users')
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .where('status', OrganizationUserStatus.APPROVED)
    .select('role_id')
    .first()) as { role_id: number } | null

  return result?.role_id ?? null
}

/**
 * Kiểm tra user có quyền quản lý members (Owner, Admin, hoặc Manager)
 *
 * @param userId - ID của user cần kiểm tra
 * @param organizationId - ID của organization
 * @param trx - Transaction client (optional)
 * @returns true nếu user có quyền quản lý members
 */
export async function canManageOrganizationMembers(
  userId: number,
  organizationId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const client = trx || db

  const result = (await client
    .from('organization_users')
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .whereIn('role_id', [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER])
    .where('status', OrganizationUserStatus.APPROVED)
    .first()) as MembershipRecord | null

  return !!result
}
