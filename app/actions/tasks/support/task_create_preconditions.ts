import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

import { enforcePolicy } from '#actions/authorization/public_api'
import type CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import type { TaskIdentityQueryRepositoryPort } from '#actions/tasks/ports/task_query_repository_port'
import type { TaskStatusQueryRepositoryPort } from '#actions/tasks/ports/task_status_query_repository_port'
import { buildTaskCreatePermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import { validateTaskCreationFields } from '#domain/tasks/task_assignment_rules'
import { canCreateTask } from '#domain/tasks/task_permission_policy'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { taskIdentityQueryRepository } from '#infra/tasks/repositories/read/task_identity_query_repository'
import { taskStatusQueryRepository } from '#infra/tasks/repositories/read/task_status_query_repository'
import type { DatabaseId } from '#types/database'
import type { TaskStatusRecord } from '#types/task_records'

export type ResolvedCreateTaskStatus = TaskStatusRecord

interface TaskCreatePreconditionDependencies {
  taskRepository: TaskIdentityQueryRepositoryPort
  taskStatusRepository: TaskStatusQueryRepositoryPort
}

const defaultDependencies: TaskCreatePreconditionDependencies = {
  taskRepository: taskIdentityQueryRepository,
  taskStatusRepository: taskStatusQueryRepository,
}

async function ensureCreatePermission(
  userId: DatabaseId,
  dto: CreateTaskDTO,
  trx: TransactionClientContract
): Promise<void> {
  const permissionContext = await buildTaskCreatePermissionContext(
    userId,
    dto.organization_id,
    dto.project_id,
    trx
  )
  enforcePolicy(canCreateTask(permissionContext))
}

async function ensureParentTaskBoundary(
  dto: CreateTaskDTO,
  trx: TransactionClientContract,
  taskRepository: TaskIdentityQueryRepositoryPort
): Promise<void> {
  if (!dto.parent_task_id) {
    return
  }

  const parentTask = await taskRepository.findActiveTaskIdentity(dto.parent_task_id, trx)

  if (!parentTask) {
    throw new BusinessLogicException('Task cha không tồn tại')
  }

  if (parentTask.organization_id !== dto.organization_id) {
    throw new BusinessLogicException('Task cha phải thuộc cùng tổ chức với task con')
  }
}

function ensureTaskCreationFieldRules(dto: CreateTaskDTO): void {
  enforcePolicy(
    validateTaskCreationFields({
      status: null,
      label: dto.label ?? null,
      priority: dto.priority ?? null,
      isDueDateInPast: dto.due_date ? dto.due_date < DateTime.now() : false,
    })
  )
}

async function ensureAssigneeBoundary(
  dto: CreateTaskDTO,
  trx: TransactionClientContract
): Promise<void> {
  if (!dto.assigned_to) {
    return
  }

  const isMember = await DefaultTaskDependencies.org.isApprovedMember(
    dto.assigned_to,
    dto.organization_id,
    trx
  )
  if (isMember) {
    return
  }

  const isFreelancer = await DefaultTaskDependencies.user.isFreelancer(dto.assigned_to, trx)
  if (!isFreelancer) {
    throw new BusinessLogicException('Người được gán phải thuộc tổ chức hoặc là freelancer')
  }
}

export async function ensureTaskCreationPreconditions(
  userId: DatabaseId,
  dto: CreateTaskDTO,
  trx: TransactionClientContract,
  dependencies: Partial<TaskCreatePreconditionDependencies> = {}
): Promise<void> {
  const deps = {
    ...defaultDependencies,
    ...dependencies,
  }

  await DefaultTaskDependencies.user.ensureActiveUser(userId, trx)
  await DefaultTaskDependencies.org.ensureActiveOrganization(dto.organization_id, trx)
  await ensureCreatePermission(userId, dto, trx)
  await DefaultTaskDependencies.project.ensureProjectBelongsToOrganization(
    dto.project_id,
    dto.organization_id,
    trx
  )
  await ensureParentTaskBoundary(dto, trx, deps.taskRepository)
  ensureTaskCreationFieldRules(dto)
  await ensureAssigneeBoundary(dto, trx)
}

export async function resolveTaskStatusForCreation(
  dto: CreateTaskDTO,
  trx: TransactionClientContract,
  dependencies: Partial<Pick<TaskCreatePreconditionDependencies, 'taskStatusRepository'>> = {}
): Promise<ResolvedCreateTaskStatus> {
  const deps = {
    taskStatusRepository: defaultDependencies.taskStatusRepository,
    ...dependencies,
  }

  const selectedStatus = await deps.taskStatusRepository.findByIdAndOrgActive(
    dto.task_status_id,
    dto.organization_id,
    trx
  )

  if (!selectedStatus) {
    throw new BusinessLogicException('Task status không tồn tại trong tổ chức hiện tại')
  }

  return selectedStatus
}
