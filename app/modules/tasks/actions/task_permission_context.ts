import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'
import type { TaskActiveAssignmentReader } from '#modules/tasks/actions/ports/outbound/task_active_assignment_reader'
import type { TaskPermissionReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type {
  TaskCollectionAccessContext,
  TaskCollectionScopeFallback,
  TaskCreatePermissionContext,
  TaskPermissionContext,
} from '#modules/tasks/domain/task-authoring/task_types'

interface TaskPermissionSource {
  id: string
  creator_id: string
  assigned_to: string | null
  organization_id: string
  project_id?: string | null
  task_visibility?: string | null
}

const normalizeProjectRole = (role: string): string | null => {
  return role === 'unknown' ? null : role
}

export async function buildTaskPermissionContext(
  userId: string,
  task: TaskPermissionSource,
  trx: TaskTransaction | undefined,
  permissionReader: TaskPermissionReader,
  assignmentReader: TaskActiveAssignmentReader | undefined
): Promise<TaskPermissionContext> {
  if (!assignmentReader) {
    throw new DependencyUnavailableException('task_active_assignment_reader', 'resolve')
  }
  if (trx) {
    const orgRoleName = await permissionReader.getOrgRoleName(userId, task.organization_id, trx)
    const projectRoleName = task.project_id
      ? await permissionReader.getProjectRoleName(userId, task.project_id, trx)
      : null
    const activeAssignment = await assignmentReader.findActiveAssignment(task.id, trx)

    return {
      actorId: userId,
      actorOrgRole: orgRoleName,
      actorProjectRole: normalizeProjectRole(projectRoleName ?? 'unknown'),
      taskCreatorId: task.creator_id,
      taskAssignedTo: task.assigned_to ?? null,
      taskOrganizationId: task.organization_id,
      taskProjectId: task.project_id ?? null,
      taskVisibility: task.task_visibility ?? null,
      isActiveAssignee: activeAssignment?.assigneeId === userId,
    }
  }

  const [orgRoleName, projectRoleName, activeAssignment] = await Promise.all([
    permissionReader.getOrgRoleName(userId, task.organization_id, trx),
    task.project_id
      ? permissionReader.getProjectRoleName(userId, task.project_id, trx)
      : Promise.resolve(null),
    assignmentReader.findActiveAssignment(task.id, trx),
  ])

  return {
    actorId: userId,
    actorOrgRole: orgRoleName,
    actorProjectRole: normalizeProjectRole(projectRoleName ?? 'unknown'),
    taskCreatorId: task.creator_id,
    taskAssignedTo: task.assigned_to ?? null,
    taskOrganizationId: task.organization_id,
    taskProjectId: task.project_id ?? null,
    taskVisibility: task.task_visibility ?? null,
    isActiveAssignee: activeAssignment?.assigneeId === userId,
  }
}

export async function buildTaskCollectionAccessContext(
  userId: string,
  organizationId: string,
  unaffiliatedScope: TaskCollectionScopeFallback,
  trx: TaskTransaction | undefined,
  permissionReader: TaskPermissionReader
): Promise<TaskCollectionAccessContext> {
  const orgRoleName = await permissionReader.getOrgRoleName(userId, organizationId, trx)

  return {
    actorId: userId,
    actorOrgRole: orgRoleName,
    unaffiliatedScope,
  }
}

export async function buildTaskCreatePermissionContext(
  userId: string,
  organizationId: string,
  projectId: string | null,
  trx: TaskTransaction | undefined,
  permissionReader: TaskPermissionReader
): Promise<TaskCreatePermissionContext> {
  if (trx) {
    const orgRoleName = await permissionReader.getOrgRoleName(userId, organizationId, trx)
    const projectRoleName = projectId
      ? await permissionReader.getProjectRoleName(userId, projectId, trx)
      : null

    return {
      actorOrgRole: orgRoleName,
      actorProjectRole: normalizeProjectRole(projectRoleName ?? 'unknown'),
      projectId,
    }
  }

  const [orgRoleName, projectRoleName] = await Promise.all([
    permissionReader.getOrgRoleName(userId, organizationId, trx),
    projectId ? permissionReader.getProjectRoleName(userId, projectId, trx) : Promise.resolve(null),
  ])

  return {
    actorOrgRole: orgRoleName,
    actorProjectRole: normalizeProjectRole(projectRoleName ?? 'unknown'),
    projectId,
  }
}
