import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

import TaskAssignmentRepository from '#infra/tasks/repositories/task_assignment_repository'
import type {
  TaskCollectionAccessContext,
  TaskCollectionScopeFallback,
  TaskCreatePermissionContext,
  TaskPermissionContext,
} from '#modules/tasks/domain/task_types'
import type { DatabaseId } from '#types/database'

interface TaskPermissionSource {
  id: DatabaseId
  creator_id: DatabaseId
  assigned_to: DatabaseId | null
  organization_id: DatabaseId
  project_id: DatabaseId | null
}

const normalizeProjectRole = (role: string): string | null => {
  return role === 'unknown' ? null : role
}

export async function buildTaskPermissionContext(
  userId: DatabaseId,
  task: TaskPermissionSource,
  trx?: TransactionClientContract
): Promise<TaskPermissionContext> {
  if (trx) {
    const systemRoleName = await DefaultTaskDependencies.permission.getSystemRoleName(userId, trx)
    const orgRoleName = await DefaultTaskDependencies.permission.getOrgRoleName(
      userId,
      task.organization_id,
      trx
    )
    const projectRoleName = task.project_id
      ? await DefaultTaskDependencies.permission.getProjectRoleName(userId, task.project_id, trx)
      : null
    const activeAssignment = await TaskAssignmentRepository.findActiveByTask(task.id, trx)

    return {
      actorId: userId,
      actorSystemRole: systemRoleName,
      actorOrgRole: orgRoleName,
      actorProjectRole: normalizeProjectRole(projectRoleName ?? 'unknown'),
      taskCreatorId: task.creator_id,
      taskAssignedTo: task.assigned_to ?? null,
      taskOrganizationId: task.organization_id,
      taskProjectId: task.project_id ?? null,
      isActiveAssignee: activeAssignment?.assignee_id === userId,
    }
  }

  const [systemRoleName, orgRoleName, projectRoleName, activeAssignment] = await Promise.all([
    DefaultTaskDependencies.permission.getSystemRoleName(userId, trx),
    DefaultTaskDependencies.permission.getOrgRoleName(userId, task.organization_id, trx),
    task.project_id
      ? DefaultTaskDependencies.permission.getProjectRoleName(userId, task.project_id, trx)
      : Promise.resolve(null),
    TaskAssignmentRepository.findActiveByTask(task.id, trx),
  ])

  return {
    actorId: userId,
    actorSystemRole: systemRoleName,
    actorOrgRole: orgRoleName,
    actorProjectRole: normalizeProjectRole(projectRoleName ?? 'unknown'),
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
    const systemRoleName = await DefaultTaskDependencies.permission.getSystemRoleName(userId, trx)
    const orgRoleName = await DefaultTaskDependencies.permission.getOrgRoleName(
      userId,
      organizationId,
      trx
    )

    return {
      actorId: userId,
      actorSystemRole: systemRoleName,
      actorOrgRole: orgRoleName,
      unaffiliatedScope,
    }
  }

  const [systemRoleName, orgRoleName] = await Promise.all([
    DefaultTaskDependencies.permission.getSystemRoleName(userId, trx),
    DefaultTaskDependencies.permission.getOrgRoleName(userId, organizationId, trx),
  ])

  return {
    actorId: userId,
    actorSystemRole: systemRoleName,
    actorOrgRole: orgRoleName,
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
    const systemRoleName = await DefaultTaskDependencies.permission.getSystemRoleName(userId, trx)
    const orgRoleName = await DefaultTaskDependencies.permission.getOrgRoleName(
      userId,
      organizationId,
      trx
    )
    const projectRoleName = projectId
      ? await DefaultTaskDependencies.permission.getProjectRoleName(userId, projectId, trx)
      : null

    return {
      actorSystemRole: systemRoleName,
      actorOrgRole: orgRoleName,
      actorProjectRole: normalizeProjectRole(projectRoleName ?? 'unknown'),
      projectId,
    }
  }

  const [systemRoleName, orgRoleName, projectRoleName] = await Promise.all([
    DefaultTaskDependencies.permission.getSystemRoleName(userId, trx),
    DefaultTaskDependencies.permission.getOrgRoleName(userId, organizationId, trx),
    projectId
      ? DefaultTaskDependencies.permission.getProjectRoleName(userId, projectId, trx)
      : Promise.resolve(null),
  ])

  return {
    actorSystemRole: systemRoleName,
    actorOrgRole: orgRoleName,
    actorProjectRole: normalizeProjectRole(projectRoleName ?? 'unknown'),
    projectId,
  }
}
