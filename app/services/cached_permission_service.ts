import type { DatabaseId } from '#types/database'
import cacheService from '#infra/cache/cache_service'
import * as PermissionService from '#services/permission_service'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * CachedPermissionService
 *
 * Wrapper quanh PermissionService, thêm Redis cache layer.
 * Giảm DB queries từ 5-7/request xuống 0-1/request cho permission checks.
 *
 * Cache Strategy:
 * - System role info: TTL 10 phút (ít thay đổi)
 * - Org membership: TTL 5 phút (thay đổi khi add/remove member)
 * - Project membership: TTL 5 phút
 * - Task permissions: KHÔNG cache (phụ thuộc nhiều factors, thay đổi thường xuyên)
 *
 * Cache Invalidation:
 * - Qua CacheInvalidationListener khi emit events
 * - Pattern: 'perm:user:{userId}:*' hoặc 'perm:org:{orgId}:*'
 *
 * QUAN TRỌNG: Khi có transaction (trx), BYPASS cache vì
 * data trong transaction chưa commit → cache có thể stale.
 */

const CACHE_TTL = {
  SYSTEM_ROLE: 600, // 10 phút
  ORG_MEMBERSHIP: 300, // 5 phút
  PROJECT_MEMBERSHIP: 300, // 5 phút
} as const

/**
 * System level — cached
 */
export async function isSystemSuperadmin(
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  // Bypass cache khi có transaction
  if (trx) {
    return PermissionService.isSystemSuperadmin(userId, trx)
  }

  const cacheKey = `perm:system:superadmin:${userId}`
  return cacheService.remember(cacheKey, CACHE_TTL.SYSTEM_ROLE, () =>
    PermissionService.isSystemSuperadmin(userId)
  )
}

export async function isSystemAdmin(
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  if (trx) {
    return PermissionService.isSystemAdmin(userId, trx)
  }

  const cacheKey = `perm:system:admin:${userId}`
  return cacheService.remember(cacheKey, CACHE_TTL.SYSTEM_ROLE, () =>
    PermissionService.isSystemAdmin(userId)
  )
}

export async function getSystemRoleInfo(userId: DatabaseId, trx?: TransactionClientContract) {
  if (trx) {
    return PermissionService.getSystemRoleInfo(userId, trx)
  }

  const cacheKey = `perm:system:roleinfo:${userId}`
  return cacheService.remember(cacheKey, CACHE_TTL.SYSTEM_ROLE, () =>
    PermissionService.getSystemRoleInfo(userId)
  )
}

/**
 * Organization level — cached
 */
export async function getOrgMembership(
  userId: DatabaseId,
  orgId: DatabaseId,
  trx?: TransactionClientContract
) {
  if (trx) {
    return PermissionService.getOrgMembership(userId, orgId, trx)
  }

  const cacheKey = `perm:org:${orgId}:member:${userId}`
  return cacheService.remember(cacheKey, CACHE_TTL.ORG_MEMBERSHIP, () =>
    PermissionService.getOrgMembership(userId, orgId)
  )
}

export async function isOrgOwner(
  userId: DatabaseId,
  orgId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  if (trx) {
    return PermissionService.isOrgOwner(userId, orgId, trx)
  }

  const cacheKey = `perm:org:${orgId}:owner:${userId}`
  return cacheService.remember(cacheKey, CACHE_TTL.ORG_MEMBERSHIP, () =>
    PermissionService.isOrgOwner(userId, orgId)
  )
}

export async function isOrgAdminOrOwner(
  userId: DatabaseId,
  orgId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  if (trx) {
    return PermissionService.isOrgAdminOrOwner(userId, orgId, trx)
  }

  const cacheKey = `perm:org:${orgId}:adminowner:${userId}`
  return cacheService.remember(cacheKey, CACHE_TTL.ORG_MEMBERSHIP, () =>
    PermissionService.isOrgAdminOrOwner(userId, orgId)
  )
}

export async function getUserOrgRoleLevel(
  userId: DatabaseId,
  orgId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number> {
  if (trx) {
    return PermissionService.getUserOrgRoleLevel(userId, orgId, trx)
  }

  const cacheKey = `perm:org:${orgId}:rolelevel:${userId}`
  return cacheService.remember(cacheKey, CACHE_TTL.ORG_MEMBERSHIP, () =>
    PermissionService.getUserOrgRoleLevel(userId, orgId)
  )
}

export async function checkOrgPermission(
  userId: DatabaseId,
  orgId: DatabaseId,
  permission: string,
  trx?: TransactionClientContract
): Promise<boolean> {
  if (trx) {
    return PermissionService.checkOrgPermission(userId, orgId, permission, trx)
  }

  const cacheKey = `perm:org:${orgId}:perm:${permission}:${userId}`
  return cacheService.remember(cacheKey, CACHE_TTL.ORG_MEMBERSHIP, () =>
    PermissionService.checkOrgPermission(userId, orgId, permission)
  )
}

/**
 * Project level — cached
 */
export async function getProjectMembership(
  userId: DatabaseId,
  projectId: DatabaseId,
  trx?: TransactionClientContract
) {
  if (trx) {
    return PermissionService.getProjectMembership(userId, projectId, trx)
  }

  const cacheKey = `perm:project:${projectId}:member:${userId}`
  return cacheService.remember(cacheKey, CACHE_TTL.PROJECT_MEMBERSHIP, () =>
    PermissionService.getProjectMembership(userId, projectId)
  )
}

export async function isProjectOwner(
  userId: DatabaseId,
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  if (trx) {
    return PermissionService.isProjectOwner(userId, projectId, trx)
  }

  const cacheKey = `perm:project:${projectId}:owner:${userId}`
  return cacheService.remember(cacheKey, CACHE_TTL.PROJECT_MEMBERSHIP, () =>
    PermissionService.isProjectOwner(userId, projectId)
  )
}

export async function checkProjectPermission(
  userId: DatabaseId,
  projectId: DatabaseId,
  permission: string,
  trx?: TransactionClientContract
): Promise<boolean> {
  if (trx) {
    return PermissionService.checkProjectPermission(userId, projectId, permission, trx)
  }

  const cacheKey = `perm:project:${projectId}:perm:${permission}:${userId}`
  return cacheService.remember(cacheKey, CACHE_TTL.PROJECT_MEMBERSHIP, () =>
    PermissionService.checkProjectPermission(userId, projectId, permission)
  )
}

/**
 * Task level — KHÔNG cache (phụ thuộc quá nhiều factors)
 * Delegate trực tiếp sang PermissionService
 */
export const canUserUpdateTask = PermissionService.canUserUpdateTask
export const canUserViewTask = PermissionService.canUserViewTask
export const canManageProject = PermissionService.canManageProject

/**
 * Invalidate tất cả permission cache của 1 user
 */
export async function invalidateUserPermissions(userId: DatabaseId): Promise<void> {
  await cacheService.deleteByPattern(`perm:*:${userId}*`)
}

/**
 * Invalidate tất cả permission cache liên quan đến 1 organization
 */
export async function invalidateOrgPermissions(orgId: DatabaseId): Promise<void> {
  await cacheService.deleteByPattern(`perm:org:${orgId}:*`)
}

/**
 * Invalidate tất cả permission cache liên quan đến 1 project
 */
export async function invalidateProjectPermissions(projectId: DatabaseId): Promise<void> {
  await cacheService.deleteByPattern(`perm:project:${projectId}:*`)
}
