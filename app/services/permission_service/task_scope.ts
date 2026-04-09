import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import {
  findActiveProject,
  findActiveTask,
  findActiveTaskAssignment,
  findActiveUser,
  findApprovedOrgMembership,
  findProjectMember,
} from './shared.js'

export async function canUserUpdateTask(
  userId: DatabaseId,
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  if (trx) {
    const user = await findActiveUser(userId, trx)
    const task = await findActiveTask(taskId, trx)
    const assignment = await findActiveTaskAssignment(taskId, userId, trx)

    if (!user || user.status !== 'active') return false
    if (!task?.organization_id) return false
    if (user.system_role === 'superadmin') return true

    if (task.creator_id === userId) {
      const creatorMembership = await findApprovedOrgMembership(userId, task.organization_id, trx)
      if (creatorMembership) return true
    }

    const orgMembership = await findApprovedOrgMembership(userId, task.organization_id, trx)
    if (orgMembership) {
      if (orgMembership.org_role === 'org_owner' || orgMembership.org_role === 'org_admin') {
        return true
      }
    }

    if (task.project_id) {
      const projectMember = await findProjectMember(userId, task.project_id, trx)
      if (projectMember) {
        if (
          projectMember.project_role === 'project_owner' ||
          projectMember.project_role === 'project_manager'
        ) {
          return true
        }
      }
    }

    return assignment !== null
  }

  const [user, task, assignment] = await Promise.all([
    findActiveUser(userId, trx),
    findActiveTask(taskId, trx),
    findActiveTaskAssignment(taskId, userId, trx),
  ])

  if (!user || user.status !== 'active') return false
  if (!task?.organization_id) return false
  if (user.system_role === 'superadmin') return true

  if (task.creator_id === userId) {
    const creatorMembership = await findApprovedOrgMembership(userId, task.organization_id, trx)
    if (creatorMembership) return true
  }

  const orgMembership = await findApprovedOrgMembership(userId, task.organization_id, trx)
  if (orgMembership) {
    if (orgMembership.org_role === 'org_owner' || orgMembership.org_role === 'org_admin') {
      return true
    }
  }

  if (task.project_id) {
    const projectMember = await findProjectMember(userId, task.project_id, trx)
    if (projectMember) {
      if (
        projectMember.project_role === 'project_owner' ||
        projectMember.project_role === 'project_manager'
      ) {
        return true
      }
    }
  }

  return assignment !== null
}

export async function canUserViewTask(
  userId: DatabaseId,
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  if (trx) {
    const user = await findActiveUser(userId, trx)
    const task = await findActiveTask(taskId, trx)
    const assignment = await findActiveTaskAssignment(taskId, userId, trx)

    if (!user) return false
    if (!task?.organization_id) return false
    if (user.system_role === 'superadmin') return true
    if (task.creator_id === userId) return true
    if (assignment) return true

    const orgMembership = await findApprovedOrgMembership(userId, task.organization_id, trx)
    if (orgMembership) return true

    if (task.project_id) {
      const projectMember = await findProjectMember(userId, task.project_id, trx)
      if (projectMember) return true
    }

    if (task.task_visibility !== 'internal' && task.project_id) {
      const publicProject = await findActiveProject(task.project_id, trx)
      if (publicProject?.visibility === 'public' && user.status === 'active') {
        return true
      }
    }

    return false
  }

  const [user, task, assignment] = await Promise.all([
    findActiveUser(userId, trx),
    findActiveTask(taskId, trx),
    findActiveTaskAssignment(taskId, userId, trx),
  ])

  if (!user) return false
  if (!task?.organization_id) return false
  if (user.system_role === 'superadmin') return true
  if (task.creator_id === userId) return true
  if (assignment) return true

  const orgMembership = await findApprovedOrgMembership(userId, task.organization_id, trx)
  if (orgMembership) return true

  if (task.project_id) {
    const projectMember = await findProjectMember(userId, task.project_id, trx)
    if (projectMember) return true
  }

  if (task.task_visibility !== 'internal' && task.project_id) {
    const publicProject = await findActiveProject(task.project_id, trx)
    if (publicProject?.visibility === 'public' && user.status === 'active') {
      return true
    }
  }

  return false
}
