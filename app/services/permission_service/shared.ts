import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { OrganizationUserStatus } from '#constants/organization_constants'
import User from '#models/user'
import OrganizationUser from '#models/organization_user'
import ProjectMember from '#models/project_member'
import Project from '#models/project'
import Task from '#models/task'
import TaskAssignment from '#models/task_assignment'

export interface OrgMembershipInfo {
  org_role: string
  permissions: string[]
}

export interface ProjectMembershipInfo {
  project_role: string
  permissions: string[]
}

export interface SystemRoleInfo {
  roleName: string | null
  isSuperadmin: boolean
  isSystemAdmin: boolean
  permissions: string[]
}

export function queryOptions(
  trx?: TransactionClientContract
): { client: TransactionClientContract } | undefined {
  return trx ? { client: trx } : undefined
}

export function findActiveUser(userId: DatabaseId, trx?: TransactionClientContract) {
  return User.query(queryOptions(trx)).where('id', userId).whereNull('deleted_at').first()
}

export function findApprovedOrgMembership(
  userId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
) {
  return OrganizationUser.query(queryOptions(trx))
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .where('status', OrganizationUserStatus.APPROVED)
    .first()
}

export function findProjectMember(
  userId: DatabaseId,
  projectId: DatabaseId,
  trx?: TransactionClientContract
) {
  return ProjectMember.query(queryOptions(trx))
    .where('user_id', userId)
    .where('project_id', projectId)
    .first()
}

export function findActiveProject(projectId: DatabaseId, trx?: TransactionClientContract) {
  return Project.query(queryOptions(trx)).where('id', projectId).whereNull('deleted_at').first()
}

export function findActiveTask(taskId: DatabaseId, trx?: TransactionClientContract) {
  return Task.query(queryOptions(trx)).where('id', taskId).whereNull('deleted_at').first()
}

export function findActiveTaskAssignment(
  taskId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
) {
  return TaskAssignment.query(queryOptions(trx))
    .where('task_id', taskId)
    .where('assignee_id', userId)
    .where('assignment_status', 'active')
    .first()
}
