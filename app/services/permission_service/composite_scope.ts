import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { getOrgMembership } from './organization_scope.js'
import { getSystemRoleInfo } from './system_scope.js'

import { canManageProjectMembers } from '#domain/projects/project_permission_policy'
import type { DatabaseId } from '#types/database'

export async function canManageProject(
  userId: DatabaseId,
  projectOwnerId: DatabaseId | null,
  projectCreatorId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const [systemRoleInfo, orgMembership] = await Promise.all([
    getSystemRoleInfo(userId, trx),
    getOrgMembership(userId, organizationId, trx),
  ])

  return canManageProjectMembers({
    actorId: userId,
    actorSystemRole: systemRoleInfo?.roleName ?? null,
    actorOrgRole: orgMembership?.org_role ?? null,
    actorProjectRole: null,
    projectOwnerId: projectOwnerId ?? ('' as DatabaseId),
    projectCreatorId,
    projectOrganizationId: organizationId,
  }).allowed
}
