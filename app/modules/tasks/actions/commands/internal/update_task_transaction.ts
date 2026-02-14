import type {
  TaskExternalDependencies,
  TaskOrgReader,
  TaskProjectReader,
  TaskUserReader,
} from '../../ports/outbound/task_external_dependencies.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi, type AuditLogData } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import { hasTaskVersionRelevantChanges } from '#modules/tasks/actions/mappers/task_version_snapshot_mapper'
import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskVersionWriter } from '#modules/tasks/actions/ports/outbound/task_version_writer'
import { buildTaskPermissionContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { validateAssignee } from '#modules/tasks/domain/task_assignment_rules'
import { canUpdateTaskFields } from '#modules/tasks/domain/task_permission_policy'
import { TaskVisibility } from '#modules/tasks/public_contracts/task_constants'
import type { TaskRecord } from '#modules/tasks/types/task_records'

export interface TaskUpdateRepositoryPort {
  lockActiveTask(taskId: string, trx: TaskTransaction): Promise<TaskRecord>
  updateTask(
    taskId: string,
    data: Record<string, unknown>,
    trx: TaskTransaction
  ): Promise<TaskRecord>
}

export type TaskVersionRepositoryPort = TaskVersionWriter

type CreateAuditLogFactory = (execCtx: TaskActionContext) => {
  handle(data: AuditLogData, trx: TaskTransaction): Promise<boolean>
}
type BuildTaskPermissionContextFn = typeof buildTaskPermissionContext
type ProjectReaderLike = Pick<TaskProjectReader, 'ensureProjectBelongsToOrganization'>
type OrganizationReaderLike = Pick<TaskOrgReader, 'isApprovedMember'>
type UserReaderLike = Pick<TaskUserReader, 'isExternalContributor'>

interface TaskParentRow {
  id: string
  organization_id: string
  parent_task_id: string | null
}

export interface PersistedTaskUpdate {
  task: TaskRecord
  oldAssignedTo: string | null
  oldValues: Record<string, unknown>
  changes: ReturnType<UpdateTaskDTO['getChangesForAudit']>
}

export interface UpdateTaskPersistenceInput {
  execCtx: TaskActionContext
  taskId: string
  dto: UpdateTaskDTO
  userId: string
  trx: TaskTransaction
  externalDependencies: TaskExternalDependencies
}

export interface UpdateTaskPersistenceDependencies {
  taskRepository?: TaskUpdateRepositoryPort
  projectReader?: ProjectReaderLike
  orgReader?: OrganizationReaderLike
  userReader?: UserReaderLike
  taskVersionRepository?: TaskVersionRepositoryPort
  createAuditLogFactory: CreateAuditLogFactory
  buildTaskPermissionContext: BuildTaskPermissionContextFn
}

const defaultDependencies: UpdateTaskPersistenceDependencies = {
  createAuditLogFactory: (execCtx: TaskActionContext) => ({
    handle: (data: AuditLogData, trx: TaskTransaction) =>
      auditPublicApi.log(data, execCtx, { trx, critical: true }),
  }),
  buildTaskPermissionContext,
}

async function createTaskVersionIfNeeded(
  task: TaskRecord,
  oldValues: Record<string, unknown>,
  changedBy: string,
  trx: TaskTransaction,
  taskVersionRepository: TaskVersionRepositoryPort
): Promise<void> {
  const newValues = { ...task }
  if (!hasTaskVersionRelevantChanges(oldValues, newValues)) return

  await taskVersionRepository.createSnapshot(task.id, oldValues, changedBy, trx)
}

async function findActiveTaskParentRow(
  tasks: TaskLifecycleRepository,
  trx: TaskTransaction,
  taskId: string
): Promise<TaskParentRow | null> {
  return tasks.findActiveParent(taskId, trx)
}

async function ensureParentUpdateBoundary(
  input: UpdateTaskPersistenceInput,
  existingTask: TaskRecord
): Promise<void> {
  if (input.dto.parent_task_id === undefined || input.dto.parent_task_id === null) {
    return
  }

  const requestedParentId = input.dto.parent_task_id

  if (requestedParentId === input.taskId) {
    enforcePolicy(PR.deny('Task cha không được là chính task hiện tại', 'BUSINESS_RULE'))
  }

  const requestedParent = await findActiveTaskParentRow(
    input.externalDependencies.lifecycle,
    input.trx,
    requestedParentId
  )

  if (!requestedParent) {
    enforcePolicy(PR.deny('Task cha không tồn tại', 'BUSINESS_RULE'))
    return
  }

  if (requestedParent.organization_id !== existingTask.organization_id) {
    enforcePolicy(PR.deny('Task cha phải thuộc cùng tổ chức với task con', 'BUSINESS_RULE'))
  }

  const visitedTaskIds = new Set<string>([requestedParentId])
  let ancestorId = requestedParent.parent_task_id

  while (ancestorId) {
    if (ancestorId === input.taskId) {
      enforcePolicy(PR.deny('Không thể tạo vòng lặp phân cấp task', 'BUSINESS_RULE'))
    }

    if (visitedTaskIds.has(ancestorId)) {
      enforcePolicy(PR.deny('Phân cấp task hiện tại đã có vòng lặp', 'BUSINESS_RULE'))
    }

    visitedTaskIds.add(ancestorId)
    const ancestor = await findActiveTaskParentRow(
      input.externalDependencies.lifecycle,
      input.trx,
      ancestorId
    )

    if (!ancestor) {
      break
    }

    if (ancestor.organization_id !== existingTask.organization_id) {
      enforcePolicy(PR.deny('Task cha phải thuộc cùng tổ chức với task con', 'BUSINESS_RULE'))
    }

    ancestorId = ancestor.parent_task_id
  }
}

function ensureUpdateVersionMatches(dto: UpdateTaskDTO, existingTask: TaskRecord): void {
  if (!dto.expected_updated_at) {
    return
  }

  if (!existingTask.updated_at || existingTask.updated_at !== dto.expected_updated_at) {
    throw new ConflictException(
      'Task đã được cập nhật bởi người khác. Vui lòng tải lại trước khi sửa tiếp.'
    )
  }
}

export async function persistTaskUpdateWithinTransaction(
  input: UpdateTaskPersistenceInput,
  dependencies: Partial<UpdateTaskPersistenceDependencies> = {}
): Promise<PersistedTaskUpdate> {
  const deps = {
    ...defaultDependencies,
    ...dependencies,
  }
  const projectReader = deps.projectReader ?? input.externalDependencies.project
  const orgReader = deps.orgReader ?? input.externalDependencies.org
  const userReader = deps.userReader ?? input.externalDependencies.user
  const permissionReader = input.externalDependencies.permission
  const taskRepository = deps.taskRepository ?? input.externalDependencies.lifecycle
  const taskVersionRepository =
    deps.taskVersionRepository ?? input.externalDependencies.versions

  // Fetch the task as a plain record (Lucid model stays inside infra)
  const existingTask = await taskRepository.lockActiveTask(
    input.taskId,
    input.trx
  )

  if (existingTask.organization_id !== input.execCtx.organizationId) {
    enforcePolicy(PR.deny('Task không thuộc tổ chức hiện tại'))
  }

  ensureUpdateVersionMatches(input.dto, existingTask)

  if (input.dto.project_id !== undefined) {
    await projectReader.ensureProjectBelongsToOrganization(
      input.dto.project_id,
      existingTask.organization_id,
      input.trx
    )
  }

  if (input.dto.project_sprint_id !== undefined && input.dto.project_sprint_id !== null) {
    const targetProjectId = input.dto.project_id ?? existingTask.project_id
    if (targetProjectId === null) {
      enforcePolicy(PR.deny('Sprint phải thuộc một dự án của task', 'BUSINESS_RULE'))
      throw new InvariantViolationException('Sprint project boundary enforcement failed')
    }
    const hasMatchingSprint = await input.externalDependencies.sprint.belongsToProject(
      input.dto.project_sprint_id,
      existingTask.organization_id,
      targetProjectId
    )

    if (!hasMatchingSprint) {
      enforcePolicy(PR.deny('Sprint không thuộc dự án của task', 'BUSINESS_RULE'))
    }
  }

  await ensureParentUpdateBoundary(input, existingTask)

  if (input.dto.assigned_to !== undefined && input.dto.assigned_to !== null) {
    const isApprovedMember = await orgReader.isApprovedMember(
      input.dto.assigned_to,
      existingTask.organization_id,
      input.trx
    )
    const isExternalContributor = await userReader.isExternalContributor(
      input.dto.assigned_to,
      input.trx
    )

    enforcePolicy(
      validateAssignee({
        isOrgMember: isApprovedMember,
        isExternalContributor,
        taskVisibility:
          input.dto.task_visibility ?? existingTask.task_visibility ?? TaskVisibility.INTERNAL,
      })
    )
  }

  const permissionContext = await deps.buildTaskPermissionContext(
    input.userId,
    existingTask,
    input.trx,
    permissionReader,
    input.externalDependencies.activeAssignmentReader
  )
  const fieldsResult = canUpdateTaskFields(permissionContext, input.dto.getUpdatedFields())
  enforcePolicy(fieldsResult)

  const oldValues: Record<string, unknown> = { ...existingTask }
  const oldAssignedTo = existingTask.assigned_to

  // Apply updates inside infra — returns TaskRecord (sealed at barrel boundary)
  const updatedTask = await taskRepository.updateTask(
    input.taskId,
    input.dto.toObject(),
    input.trx
  )

  const changes = input.dto.getChangesForAudit(oldValues)
  await deps.createAuditLogFactory(input.execCtx).handle(
    {
      user_id: input.userId,
      action: AuditAction.UPDATE,
      entity_type: EntityType.TASK,
      entity_id: input.taskId,
      old_values: oldValues,
      new_values: { ...updatedTask },
    },
    input.trx
  )

  await createTaskVersionIfNeeded(
    updatedTask,
    oldValues,
    input.userId,
    input.trx,
    taskVersionRepository
  )

  return {
    task: updatedTask,
    oldAssignedTo,
    oldValues,
    changes,
  }
}
