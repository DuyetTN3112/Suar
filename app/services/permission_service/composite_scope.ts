import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { isOrgAdminOrOwner } from './organization_scope.js'
import { isSystemSuperadmin } from './system_scope.js'

import type { DatabaseId } from '#types/database'

export async function canManageProject(
  userId: DatabaseId,
  projectOwnerId: DatabaseId | null,
  projectCreatorId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  if (userId === projectOwnerId || userId === projectCreatorId) return true
  if (await isSystemSuperadmin(userId, trx)) return true
  if (await isOrgAdminOrOwner(userId, organizationId, trx)) return true

  return false
}
