import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { hasSystemPermission, SYSTEM_ROLE_PERMISSIONS } from '#constants/permissions'
import { findActiveUser, type SystemRoleInfo } from './shared.js'

export async function isSystemSuperadmin(
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const user = await findActiveUser(userId, trx)
  return user?.system_role === 'superadmin'
}

export async function isSystemAdmin(
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const user = await findActiveUser(userId, trx)

  if (!user?.system_role) return false
  return user.system_role === 'superadmin' || user.system_role === 'system_admin'
}

export async function checkSystemPermission(
  userId: DatabaseId,
  permission: string,
  trx?: TransactionClientContract
): Promise<boolean> {
  const user = await findActiveUser(userId, trx)

  if (!user?.system_role) return false
  return hasSystemPermission(user.system_role, permission)
}

export async function getSystemRoleInfo(
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<SystemRoleInfo | null> {
  const user = await findActiveUser(userId, trx)

  if (!user?.system_role) return null

  return {
    roleName: user.system_role,
    isSuperadmin: user.system_role === 'superadmin',
    isSystemAdmin: user.system_role === 'superadmin' || user.system_role === 'system_admin',
    permissions: [...(SYSTEM_ROLE_PERMISSIONS[user.system_role] ?? [])],
  }
}
