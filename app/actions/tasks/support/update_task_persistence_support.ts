import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  TaskOrgReader,
  TaskProjectReader,
  TaskUserReader,
} from '../ports/task_external_dependencies.js'
import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

import { auditPublicApi, type AuditLogData } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import type UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import {
  hasTaskVersionRelevantChanges,
} from '#actions/tasks/support/task_version_snapshot'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { PolicyResult as PR } from '#domain/policies/policy_result'
import { validateAssignee } from '#domain/tasks/task_assignment_rules'
import { canUpdateTaskFields } from '#domain/tasks/task_permission_policy'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskVersionRepository from '#infra/tasks/repositories/task_version_repository'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskRecord } from '#types/task_records'

export interface TaskUpdateRepositoryPort {
  findActiveForUpdateAsRecord(
    taskId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<TaskRecord>
  updateTask(
    taskId: DatabaseId,
    data: Record<string, unknown>,
    trx?: TransactionClientContract
  ): Promise<TaskRecord>
}

export interface TaskVersionRepositoryPort {
  createSnapshot(
    taskId: DatabaseId,
    snapshotData: Record<string, unknown>,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void>
}

type ProjectReaderLike = Pick<TaskProjectReader, 'ensureProjectBelongsToOrganization'>
type OrganizationReaderLike = Pick<TaskOrgReader, 'isApprovedMember'>
type UserReaderLike = Pick<TaskUserReader, 'isFreelancer'>
type CreateAuditLogFactory = (execCtx: ExecutionContext) => {
  handle(data: AuditLogData): Promise<boolean>
}
type BuildTaskPermissionContextFn = typeof buildTaskPermissionContext

export interface PersistedTaskUpdate {
  task: TaskRecord
  oldAssignedTo: DatabaseId | null
  oldValues: Record<string, unknown>
  changes: ReturnType<UpdateTaskDTO['getChangesForAudit']>
}

export interface UpdateTaskPersistenceInput {
  execCtx: ExecutionContext
  taskId: DatabaseId
  dto: UpdateTaskDTO
  userId: DatabaseId
  trx: TransactionClientContract
}

export interface UpdateTaskPersistenceDependencies {
  taskRepository: TaskUpdateRepositoryPort
  projectReader: ProjectReaderLike
  orgReader: OrganizationReaderLike
  userReader: UserReaderLike
  taskVersionRepository: TaskVersionRepositoryPort
  createAuditLogFactory: CreateAuditLogFactory
  buildTaskPermissionContext: BuildTaskPermissionContextFn
}

const defaultDependencies: UpdateTaskPersistenceDependencies = {
  taskRepository: TaskRepository,
  projectReader: DefaultTaskDependencies.project,
  orgReader: DefaultTaskDependencies.org,
  userReader: DefaultTaskDependencies.user,
  taskVersionRepository: TaskVersionRepository,
  createAuditLogFactory: (execCtx: ExecutionContext) => ({
    handle: (data: AuditLogData) => auditPublicApi.log(data, execCtx),
  }),
  buildTaskPermissionContext,
}

async function createTaskVersionIfNeeded(
  task: TaskRecord,
  oldValues: Record<string, unknown>,
  changedBy: DatabaseId,
  trx: TransactionClientContract,
  taskVersionRepository: TaskVersionRepositoryPort
): Promise<void> {
  const newValues = { ...task }
  if (!hasTaskVersionRelevantChanges(oldValues, newValues)) return

  await taskVersionRepository.createSnapshot(
    task.id,
    oldValues,
    changedBy,
    trx
  )
}

export async function persistTaskUpdateWithinTransaction(
  input: UpdateTaskPersistenceInput,
  dependencies: Partial<UpdateTaskPersistenceDependencies> = {}
): Promise<PersistedTaskUpdate> {
  const deps = {
    ...defaultDependencies,
    ...dependencies,
  }

  // Fetch the task as a plain record (Lucid model stays inside infra)
  const existingTask = await deps.taskRepository.findActiveForUpdateAsRecord(
    input.taskId,
    input.trx
  )

  if (existingTask.organization_id !== input.execCtx.organizationId) {
    enforcePolicy(PR.deny('Task không thuộc tổ chức hiện tại'))
  }

  if (input.dto.project_id !== undefined) {
    await deps.projectReader.ensureProjectBelongsToOrganization(
      input.dto.project_id,
      existingTask.organization_id,
      input.trx
    )
  }

  if (input.dto.assigned_to !== undefined && input.dto.assigned_to !== null) {
    const isApprovedMember = await deps.orgReader.isApprovedMember(
      input.dto.assigned_to,
      existingTask.organization_id,
      input.trx
    )
    const isFreelancer = await deps.userReader.isFreelancer(input.dto.assigned_to, input.trx)

    enforcePolicy(
      validateAssignee({
        isOrgMember: isApprovedMember,
        isFreelancer,
        taskVisibility: existingTask.task_visibility ?? 'private',
      })
    )
  }

  const permissionContext = await deps.buildTaskPermissionContext(
    input.userId,
    existingTask,
    input.trx
  )
  const fieldsResult = canUpdateTaskFields(permissionContext, input.dto.getUpdatedFields())
  enforcePolicy(fieldsResult)

  const oldValues: Record<string, unknown> = { ...existingTask }
  const oldAssignedTo = existingTask.assigned_to

  // Apply updates inside infra — returns TaskRecord (sealed at barrel boundary)
  const updatedTask = await deps.taskRepository.updateTask(
    input.taskId,
    input.dto.toObject(),
    input.trx
  )

  const changes = input.dto.getChangesForAudit(oldValues)
  await deps.createAuditLogFactory(input.execCtx).handle({
    user_id: input.userId,
    action: AuditAction.UPDATE,
    entity_type: EntityType.TASK,
    entity_id: input.taskId,
    old_values: oldValues,
    new_values: { ...updatedTask },
  })

  await createTaskVersionIfNeeded(
    updatedTask,
    oldValues,
    input.userId,
    input.trx,
    deps.taskVersionRepository
  )

  return {
    task: updatedTask,
    oldAssignedTo,
    oldValues,
    changes,
  }
}
