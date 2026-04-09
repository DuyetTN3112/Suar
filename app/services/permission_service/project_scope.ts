import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import {
  getProjectRoleLevel,
  hasProjectPermission,
  PROJECT_ROLE_PERMISSIONS,
} from '#constants/permissions'
import {
  findActiveProject,
  findActiveUser,
  findApprovedOrgMembership,
  findProjectMember,
  type ProjectMembershipInfo,
} from './shared.js'

export async function getProjectMembership(
  userId: DatabaseId,
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<ProjectMembershipInfo | null> {
  const member = await findProjectMember(userId, projectId, trx)

  if (!member) return null

  return {
    project_role: member.project_role,
    permissions: [...(PROJECT_ROLE_PERMISSIONS[member.project_role] ?? [])],
  }
}

export async function isProjectOwner(
  userId: DatabaseId,
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const project = await findActiveProject(projectId, trx)
  return project?.owner_id === userId
}

export async function isProjectManagerOrOwner(
  userId: DatabaseId,
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const membership = await getProjectMembership(userId, projectId, trx)
  if (!membership) return false

  return (
    membership.project_role === 'project_owner' || membership.project_role === 'project_manager'
  )
}

export async function getUserProjectRoleLevel(
  userId: DatabaseId,
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number> {
  const membership = await getProjectMembership(userId, projectId, trx)
  if (!membership) return 0
  return getProjectRoleLevel(membership.project_role)
}

export async function checkProjectPermission(
  userId: DatabaseId,
  projectId: DatabaseId,
  permission: string,
  trx?: TransactionClientContract
): Promise<boolean> {
  const [user, project] = await Promise.all([
    findActiveUser(userId, trx),
    findActiveProject(projectId, trx),
  ])

  if (!user || !project) return false
  if (user.system_role === 'superadmin') return true

  const orgHighPrivilegeExclusions = ['can_delete_project', 'can_transfer_ownership']
  if (!orgHighPrivilegeExclusions.includes(permission)) {
    const orgMembership = await findApprovedOrgMembership(userId, project.organization_id, trx)
    if (orgMembership) {
      if (orgMembership.org_role === 'org_owner' || orgMembership.org_role === 'org_admin') {
        return true
      }
    }
  }

  const membership = await getProjectMembership(userId, projectId, trx)
  if (!membership) return false

  return hasProjectPermission(membership.project_role, permission)
}
