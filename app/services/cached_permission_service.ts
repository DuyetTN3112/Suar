import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import cacheService from '#infra/cache/cache_service'
import * as PermissionService from '#services/permission_service'
import type { DatabaseId } from '#types/database'

const CACHE_TTL = {
  SYSTEM_ROLE: 600,
  ORG_MEMBERSHIP: 300,
  PROJECT_MEMBERSHIP: 300,
} as const

export async function isSystemSuperadmin(
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
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

export const canUserUpdateTask = PermissionService.canUserUpdateTask
export const canUserViewTask = PermissionService.canUserViewTask
export const canManageProject = PermissionService.canManageProject

export async function invalidateUserPermissions(userId: DatabaseId): Promise<void> {
  await cacheService.deleteByPattern(`perm:*:${userId}*`)
}

export async function invalidateOrgPermissions(orgId: DatabaseId): Promise<void> {
  await cacheService.deleteByPattern(`perm:org:${orgId}:*`)
}

export async function invalidateProjectPermissions(projectId: DatabaseId): Promise<void> {
  await cacheService.deleteByPattern(`perm:project:${projectId}:*`)
}
