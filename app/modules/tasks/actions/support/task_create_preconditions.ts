import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskIdentityQueryRepositoryPort } from '#modules/tasks/actions/ports/task_query_repository_port'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/task_status_query_repository_port'
import { buildTaskCreatePermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { validateTaskCreationFields } from '#modules/tasks/domain/task_assignment_rules'
import { canCreateTask } from '#modules/tasks/domain/task_permission_policy'
import { taskIdentityQueryRepository } from '#modules/tasks/infra/repositories/read/task_identity_query_repository'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/read/task_status_query_repository'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

export type ResolvedCreateTaskStatus = TaskStatusRecord

interface TaskCreatePreconditionDependencies {
  taskRepository: TaskIdentityQueryRepositoryPort
  taskStatusRepository: TaskStatusQueryRepositoryPort
  externalDependencies: TaskExternalDependencies
}

const defaultDependencies: Omit<TaskCreatePreconditionDependencies, 'externalDependencies'> = {
  taskRepository: taskIdentityQueryRepository,
  taskStatusRepository: taskStatusQueryRepository,
}

async function ensureCreatePermission(
  userId: string,
  dto: CreateTaskDTO,
  trx: TransactionClientContract,
  externalDependencies: TaskExternalDependencies
): Promise<void> {
  const permissionContext = await buildTaskCreatePermissionContext(
    userId,
    dto.organization_id,
    dto.project_id,
    trx,
    externalDependencies.permission
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
  trx: TransactionClientContract,
  externalDependencies: TaskExternalDependencies
): Promise<void> {
  if (!dto.assigned_to) {
    return
  }

  const isMember = await externalDependencies.org.isApprovedMember(
    dto.assigned_to,
    dto.organization_id,
    trx
  )
  if (isMember) {
    return
  }

  const isFreelancer = await externalDependencies.user.isFreelancer(dto.assigned_to, trx)
  if (!isFreelancer) {
    throw new BusinessLogicException('Người được gán phải thuộc tổ chức hoặc là freelancer')
  }
}

export async function ensureTaskCreationPreconditions(
  userId: string,
  dto: CreateTaskDTO,
  trx: TransactionClientContract,
  dependencies: Partial<Omit<TaskCreatePreconditionDependencies, 'externalDependencies'>> &
    Pick<TaskCreatePreconditionDependencies, 'externalDependencies'>
): Promise<void> {
  const deps = {
    ...defaultDependencies,
    ...dependencies,
  }

  await deps.externalDependencies.user.ensureActiveUser(userId, trx)
  await deps.externalDependencies.org.ensureActiveOrganization(dto.organization_id, trx)
  await ensureCreatePermission(userId, dto, trx, deps.externalDependencies)
  await deps.externalDependencies.project.ensureProjectBelongsToOrganization(
    dto.project_id,
    dto.organization_id,
    trx
  )
  await ensureParentTaskBoundary(dto, trx, deps.taskRepository)
  ensureTaskCreationFieldRules(dto)
  await ensureAssigneeBoundary(dto, trx, deps.externalDependencies)
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
