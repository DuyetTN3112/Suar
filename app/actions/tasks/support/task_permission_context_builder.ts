import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import TaskAssignmentRepository from '#infra/tasks/repositories/task_assignment_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import type {
  TaskCollectionAccessContext,
  TaskCollectionScopeFallback,
  TaskCreatePermissionContext,
  TaskPermissionContext,
} from '#domain/tasks/task_types'
import type Task from '#models/task'
import type { DatabaseId } from '#types/database'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

type TaskPermissionSource = Pick<
  Task,
  'id' | 'creator_id' | 'assigned_to' | 'organization_id' | 'project_id'
>

const normalizeProjectRole = (role: string): string | null => {
  return role === 'unknown' ? null : role
}

export async function buildTaskPermissionContext(
  userId: DatabaseId,
  task: TaskPermissionSource,
  trx?: TransactionClientContract
): Promise<TaskPermissionContext> {
  if (trx) {
    const actorSystemRole = await UserRepository.getSystemRoleName(userId, trx)
    const actorOrgRole = await OrganizationUserRepository.getMemberRoleName(
      task.organization_id,
      userId,
      trx,
      true
    )
    const actorProjectRole = task.project_id
      ? normalizeProjectRole(
          await ProjectMemberRepository.getRoleName(task.project_id, userId, trx)
        )
      : null
    const activeAssignment = await TaskAssignmentRepository.findActiveByTask(task.id, trx)

    return {
      actorId: userId,
      actorSystemRole,
      actorOrgRole,
      actorProjectRole,
      taskCreatorId: task.creator_id,
      taskAssignedTo: task.assigned_to ?? null,
      taskOrganizationId: task.organization_id,
      taskProjectId: task.project_id ?? null,
      isActiveAssignee: activeAssignment?.assignee_id === userId,
    }
  }

  const [actorSystemRole, actorOrgRole, actorProjectRole, activeAssignment] = await Promise.all([
    UserRepository.getSystemRoleName(userId, trx),
    OrganizationUserRepository.getMemberRoleName(task.organization_id, userId, trx, true),
    task.project_id
      ? ProjectMemberRepository.getRoleName(task.project_id, userId, trx).then(normalizeProjectRole)
      : Promise.resolve(null),
    TaskAssignmentRepository.findActiveByTask(task.id, trx),
  ])

  return {
    actorId: userId,
    actorSystemRole,
    actorOrgRole,
    actorProjectRole,
    taskCreatorId: task.creator_id,
    taskAssignedTo: task.assigned_to ?? null,
    taskOrganizationId: task.organization_id,
    taskProjectId: task.project_id ?? null,
    isActiveAssignee: activeAssignment?.assignee_id === userId,
  }
}

export async function buildTaskCollectionAccessContext(
  userId: DatabaseId,
  organizationId: DatabaseId,
  unaffiliatedScope: TaskCollectionScopeFallback,
  trx?: TransactionClientContract
): Promise<TaskCollectionAccessContext> {
  if (trx) {
    const actorSystemRole = await UserRepository.getSystemRoleName(userId, trx)
    const actorOrgRole = await OrganizationUserRepository.getMemberRoleName(
      organizationId,
      userId,
      trx,
      true
    )

    return {
      actorId: userId,
      actorSystemRole,
      actorOrgRole,
      unaffiliatedScope,
    }
  }

  const [actorSystemRole, actorOrgRole] = await Promise.all([
    UserRepository.getSystemRoleName(userId, trx),
    OrganizationUserRepository.getMemberRoleName(organizationId, userId, trx, true),
  ])

  return {
    actorId: userId,
    actorSystemRole,
    actorOrgRole,
    unaffiliatedScope,
  }
}

export async function buildTaskCreatePermissionContext(
  userId: DatabaseId,
  organizationId: DatabaseId,
  projectId: DatabaseId | null,
  trx?: TransactionClientContract
): Promise<TaskCreatePermissionContext> {
  if (trx) {
    const actorSystemRole = await UserRepository.getSystemRoleName(userId, trx)
    const actorOrgRole = await OrganizationUserRepository.getMemberRoleName(
      organizationId,
      userId,
      trx,
      true
    )
    const actorProjectRole = projectId
      ? normalizeProjectRole(await ProjectMemberRepository.getRoleName(projectId, userId, trx))
      : null

    return {
      actorSystemRole,
      actorOrgRole,
      actorProjectRole,
      projectId,
    }
  }

  const [actorSystemRole, actorOrgRole, actorProjectRole] = await Promise.all([
    UserRepository.getSystemRoleName(userId, trx),
    OrganizationUserRepository.getMemberRoleName(organizationId, userId, trx, true),
    projectId
      ? ProjectMemberRepository.getRoleName(projectId, userId, trx).then(normalizeProjectRole)
      : Promise.resolve(null),
  ])

  return {
    actorSystemRole,
    actorOrgRole,
    actorProjectRole,
    projectId,
  }
}
