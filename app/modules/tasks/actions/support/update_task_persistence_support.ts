import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  TaskExternalDependencies,
  TaskOrgReader,
  TaskProjectReader,
  TaskUserReader,
} from '../ports/task_external_dependencies.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi, type AuditLogData } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import type UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import {
  hasTaskVersionRelevantChanges,
} from '#modules/tasks/actions/support/task_version_snapshot'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { validateAssignee } from '#modules/tasks/domain/task_assignment_rules'
import { canUpdateTaskFields } from '#modules/tasks/domain/task_permission_policy'
import TaskVersionRepository from '#modules/tasks/infra/repositories/task_version_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord } from '#modules/tasks/types/task_records'

export interface TaskUpdateRepositoryPort {
  findActiveForUpdateAsRecord(
    taskId: string,
    trx: TransactionClientContract
  ): Promise<TaskRecord>
  updateTask(
    taskId: string,
    data: Record<string, unknown>,
    trx?: TransactionClientContract
  ): Promise<TaskRecord>
}

export interface TaskVersionRepositoryPort {
  createSnapshot(
    taskId: string,
    snapshotData: Record<string, unknown>,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<void>
}

type CreateAuditLogFactory = (execCtx: TaskActionContext) => {
  handle(data: AuditLogData): Promise<boolean>
}
type BuildTaskPermissionContextFn = typeof buildTaskPermissionContext
type ProjectReaderLike = Pick<TaskProjectReader, 'ensureProjectBelongsToOrganization'>
type OrganizationReaderLike = Pick<TaskOrgReader, 'isApprovedMember'>
type UserReaderLike = Pick<TaskUserReader, 'isFreelancer'>

const nullPermissionReader = {
  getSystemRoleName: () => Promise.resolve(null),
  getOrgRoleName: () => Promise.resolve(null),
  getProjectRoleName: () => Promise.resolve(null),
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
  trx: TransactionClientContract
  externalDependencies?: TaskExternalDependencies
}

export interface UpdateTaskPersistenceDependencies {
  taskRepository: TaskUpdateRepositoryPort
  projectReader?: ProjectReaderLike
  orgReader?: OrganizationReaderLike
  userReader?: UserReaderLike
  taskVersionRepository: TaskVersionRepositoryPort
  createAuditLogFactory: CreateAuditLogFactory
  buildTaskPermissionContext: BuildTaskPermissionContextFn
}

const defaultDependencies: UpdateTaskPersistenceDependencies = {
  taskRepository: taskMutations,
  taskVersionRepository: TaskVersionRepository,
  createAuditLogFactory: (execCtx: TaskActionContext) => ({
    handle: (data: AuditLogData) => auditPublicApi.log(data, execCtx),
  }),
  buildTaskPermissionContext,
}

async function createTaskVersionIfNeeded(
  task: TaskRecord,
  oldValues: Record<string, unknown>,
  changedBy: string,
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
  if (!input.externalDependencies) {
    if (!deps.projectReader || !deps.orgReader || !deps.userReader) {
      throw new Error('Task external dependencies are required for task update')
    }
  }
  const projectReader = input.externalDependencies?.project ?? deps.projectReader
  const orgReader = input.externalDependencies?.org ?? deps.orgReader
  const userReader = input.externalDependencies?.user ?? deps.userReader
  const permissionReader = input.externalDependencies?.permission

  if (!projectReader || !orgReader || !userReader) {
    throw new Error('Task external dependencies are required for task update')
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
    await projectReader.ensureProjectBelongsToOrganization(
      input.dto.project_id,
      existingTask.organization_id,
      input.trx
    )
  }

  if (input.dto.assigned_to !== undefined && input.dto.assigned_to !== null) {
    const isApprovedMember = await orgReader.isApprovedMember(
      input.dto.assigned_to,
      existingTask.organization_id,
      input.trx
    )
    const isFreelancer = await userReader.isFreelancer(
      input.dto.assigned_to,
      input.trx
    )

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
    input.trx,
    permissionReader ?? nullPermissionReader
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
