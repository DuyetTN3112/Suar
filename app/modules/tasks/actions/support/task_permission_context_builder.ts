import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TaskPermissionReader } from '#modules/tasks/actions/ports/task_external_dependencies'
import type {
  TaskCollectionAccessContext,
  TaskCollectionScopeFallback,
  TaskCreatePermissionContext,
  TaskPermissionContext,
} from '#modules/tasks/domain/task_types'
import TaskAssignmentRepository from '#modules/tasks/infra/repositories/task_assignment_repository'

interface TaskPermissionSource {
  id: string
  creator_id: string
  assigned_to: string | null
  organization_id: string
  project_id: string | null
}

const normalizeProjectRole = (role: string): string | null => {
  return role === 'unknown' ? null : role
}

export async function buildTaskPermissionContext(
  userId: string,
  task: TaskPermissionSource,
  trx: TransactionClientContract | undefined,
  permissionReader: TaskPermissionReader
): Promise<TaskPermissionContext> {
  if (trx) {
    const systemRoleName = await permissionReader.getSystemRoleName(userId, trx)
    const orgRoleName = await permissionReader.getOrgRoleName(
      userId,
      task.organization_id,
      trx
    )
    const projectRoleName = task.project_id
      ? await permissionReader.getProjectRoleName(userId, task.project_id, trx)
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
    permissionReader.getSystemRoleName(userId, trx),
    permissionReader.getOrgRoleName(userId, task.organization_id, trx),
    task.project_id
      ? permissionReader.getProjectRoleName(userId, task.project_id, trx)
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
  userId: string,
  organizationId: string,
  unaffiliatedScope: TaskCollectionScopeFallback,
  trx: TransactionClientContract | undefined,
  permissionReader: TaskPermissionReader
): Promise<TaskCollectionAccessContext> {
  if (trx) {
    const systemRoleName = await permissionReader.getSystemRoleName(userId, trx)
    const orgRoleName = await permissionReader.getOrgRoleName(
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
    permissionReader.getSystemRoleName(userId, trx),
    permissionReader.getOrgRoleName(userId, organizationId, trx),
  ])

  return {
    actorId: userId,
    actorSystemRole: systemRoleName,
    actorOrgRole: orgRoleName,
    unaffiliatedScope,
  }
}

export async function buildTaskCreatePermissionContext(
  userId: string,
  organizationId: string,
  projectId: string | null,
  trx: TransactionClientContract | undefined,
  permissionReader: TaskPermissionReader
): Promise<TaskCreatePermissionContext> {
  if (trx) {
    const systemRoleName = await permissionReader.getSystemRoleName(userId, trx)
    const orgRoleName = await permissionReader.getOrgRoleName(
      userId,
      organizationId,
      trx
    )
    const projectRoleName = projectId
      ? await permissionReader.getProjectRoleName(userId, projectId, trx)
      : null

    return {
      actorSystemRole: systemRoleName,
      actorOrgRole: orgRoleName,
      actorProjectRole: normalizeProjectRole(projectRoleName ?? 'unknown'),
      projectId,
    }
  }

  const [systemRoleName, orgRoleName, projectRoleName] = await Promise.all([
    permissionReader.getSystemRoleName(userId, trx),
    permissionReader.getOrgRoleName(userId, organizationId, trx),
    projectId
      ? permissionReader.getProjectRoleName(userId, projectId, trx)
      : Promise.resolve(null),
  ])

  return {
    actorSystemRole: systemRoleName,
    actorOrgRole: orgRoleName,
    actorProjectRole: normalizeProjectRole(projectRoleName ?? 'unknown'),
    projectId,
  }
}
