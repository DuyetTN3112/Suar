import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { enforcePolicy } from '#actions/authorization/enforce_policy'
import type CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import { buildTaskCreatePermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import { validateTaskCreationFields } from '#domain/tasks/task_assignment_rules'
import { canCreateTask } from '#domain/tasks/task_permission_policy'
import BusinessLogicException from '#exceptions/business_logic_exception'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import type { DatabaseId } from '#types/database'

import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

export type ResolvedCreateTaskStatus = NonNullable<
  Awaited<ReturnType<typeof TaskStatusRepository.findByIdAndOrgActive>>
>

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
  trx: TransactionClientContract
): Promise<void> {
  if (!dto.parent_task_id) {
    return
  }

  const parentTask = await TaskRepository.findActiveTaskIdentity(dto.parent_task_id, trx)

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
  trx: TransactionClientContract
): Promise<void> {
  await DefaultTaskDependencies.user.ensureActiveUser(userId, trx)
  await DefaultTaskDependencies.org.ensureActiveOrganization(dto.organization_id, trx)
  await ensureCreatePermission(userId, dto, trx)
  await DefaultTaskDependencies.project.ensureProjectBelongsToOrganization(
    dto.project_id,
    dto.organization_id,
    trx
  )
  await ensureParentTaskBoundary(dto, trx)
  ensureTaskCreationFieldRules(dto)
  await ensureAssigneeBoundary(dto, trx)
}

export async function resolveTaskStatusForCreation(
  dto: CreateTaskDTO,
  trx: TransactionClientContract
): Promise<ResolvedCreateTaskStatus> {
  const selectedStatus = await TaskStatusRepository.findByIdAndOrgActive(
    dto.task_status_id,
    dto.organization_id,
    trx
  )

  if (!selectedStatus) {
    throw new BusinessLogicException('Task status không tồn tại trong tổ chức hiện tại')
  }

  return selectedStatus
}
