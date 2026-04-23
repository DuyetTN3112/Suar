import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import CreateAuditLog from '#actions/audit/create_audit_log'
import { enforcePolicy } from '#actions/authorization/enforce_policy'
import type UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import { buildTaskVersionSnapshot, hasTaskVersionRelevantChanges } from '#actions/tasks/support/task_version_snapshot'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { PolicyResult as PR } from '#domain/policies/policy_result'
import { validateAssignee } from '#domain/tasks/task_assignment_rules'
import { canUpdateTaskFields } from '#domain/tasks/task_permission_policy'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskVersionRepository from '#infra/tasks/repositories/task_version_repository'
import type Task from '#models/task'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

import type {
  TaskOrgReader,
  TaskProjectReader,
  TaskUserReader,
} from '../ports/task_external_dependencies.js'
import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

type TaskRepositoryLike = Pick<typeof TaskRepository, 'findActiveForUpdate' | 'save'>
type ProjectReaderLike = Pick<TaskProjectReader, 'ensureProjectBelongsToOrganization'>
type OrganizationReaderLike = Pick<TaskOrgReader, 'isApprovedMember'>
type UserReaderLike = Pick<TaskUserReader, 'isFreelancer'>
type TaskVersionRepositoryLike = Pick<typeof TaskVersionRepository, 'createSnapshot'>
type CreateAuditLogFactory = (execCtx: ExecutionContext) => Pick<CreateAuditLog, 'handle'>
type BuildTaskPermissionContextFn = typeof buildTaskPermissionContext

export interface PersistedTaskUpdate {
  task: Task
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
  taskRepository: TaskRepositoryLike
  projectReader: ProjectReaderLike
  orgReader: OrganizationReaderLike
  userReader: UserReaderLike
  taskVersionRepository: TaskVersionRepositoryLike
  createAuditLogFactory: CreateAuditLogFactory
  buildTaskPermissionContext: BuildTaskPermissionContextFn
}

const defaultDependencies: UpdateTaskPersistenceDependencies = {
  taskRepository: TaskRepository,
  projectReader: DefaultTaskDependencies.project,
  orgReader: DefaultTaskDependencies.org,
  userReader: DefaultTaskDependencies.user,
  taskVersionRepository: TaskVersionRepository,
  createAuditLogFactory: (execCtx: ExecutionContext) => new CreateAuditLog(execCtx),
  buildTaskPermissionContext,
}

async function createTaskVersionIfNeeded(
  task: Task,
  oldValues: Record<string, unknown>,
  changedBy: DatabaseId,
  trx: TransactionClientContract,
  taskVersionRepository: TaskVersionRepositoryLike
): Promise<void> {
  const newValues = task.toJSON() as Record<string, unknown>
  if (!hasTaskVersionRelevantChanges(oldValues, newValues)) return

  const snapshot = buildTaskVersionSnapshot(oldValues)
  await taskVersionRepository.createSnapshot(
    {
      task_id: snapshot.task_id,
      title: snapshot.title,
      description: snapshot.description,
      status: snapshot.status,
      label: snapshot.label,
      priority: snapshot.priority,
      difficulty: snapshot.difficulty,
      assigned_to: snapshot.assigned_to,
      changed_by: changedBy,
    },
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

  const existingTask = await deps.taskRepository.findActiveForUpdate(input.taskId, input.trx)

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
        taskVisibility: existingTask.task_visibility,
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

  const oldValues = existingTask.toJSON() as Record<string, unknown>
  const oldAssignedTo = existingTask.assigned_to

  existingTask.merge(input.dto.toObject())
  await deps.taskRepository.save(existingTask, input.trx)

  const changes = input.dto.getChangesForAudit(oldValues)
  await deps.createAuditLogFactory(input.execCtx).handle({
    user_id: input.userId,
    action: AuditAction.UPDATE,
    entity_type: EntityType.TASK,
    entity_id: input.taskId,
    old_values: oldValues,
    new_values: existingTask.toJSON(),
  })

  await createTaskVersionIfNeeded(
    existingTask,
    oldValues,
    input.userId,
    input.trx,
    deps.taskVersionRepository
  )

  return {
    task: existingTask,
    oldAssignedTo,
    oldValues,
    changes,
  }
}
