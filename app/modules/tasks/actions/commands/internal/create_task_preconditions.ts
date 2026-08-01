import { DateTime } from 'luxon'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskIdentityQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_query_repository_port'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { buildTaskCreatePermissionContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import { validateAssignee, validateTaskCreationFields } from '#modules/tasks/domain/task_assignment_rules'
import { canCreateTask } from '#modules/tasks/domain/task_permission_policy'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

/** Preconditions owned by the create-task transaction workflow. */
export type ResolvedCreateTaskStatus = TaskStatusRecord

interface TaskCreatePreconditionDependencies {
  taskRepository: TaskIdentityQueryRepositoryPort
  taskStatusRepository: TaskStatusQueryRepositoryPort
  externalDependencies: TaskExternalDependencies
}

async function ensureCreatePermission(
  userId: string,
  dto: CreateTaskDTO,
  trx: TaskTransaction,
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
  trx: TaskTransaction,
  taskRepository: TaskIdentityQueryRepositoryPort
): Promise<void> {
  if (!dto.parent_task_id) {
    return
  }

  const parentTask = await taskRepository.findActiveTaskIdentity(dto.parent_task_id, trx)

  if (!parentTask) {
    throw NotFoundException.task(dto.parent_task_id)
  }

  if (parentTask.organization_id !== dto.organization_id) {
    // Cross-tenant identifiers are intentionally indistinguishable from missing resources.
    throw NotFoundException.task(dto.parent_task_id)
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
  trx: TaskTransaction,
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
  const isExternalContributor = await externalDependencies.user.isExternalContributor(dto.assigned_to, trx)
  enforcePolicy(
    validateAssignee({
      isOrgMember: isMember,
      isExternalContributor,
      taskVisibility: dto.task_visibility,
    })
  )
}

export async function ensureTaskCreationPreconditions(
  userId: string,
  dto: CreateTaskDTO,
  trx: TaskTransaction,
  dependencies: TaskCreatePreconditionDependencies
): Promise<void> {
  await dependencies.externalDependencies.user.ensureActiveUser(userId, trx)
  await dependencies.externalDependencies.org.ensureActiveOrganization(dto.organization_id, trx)
  await ensureCreatePermission(userId, dto, trx, dependencies.externalDependencies)
  await dependencies.externalDependencies.project.ensureProjectBelongsToOrganization(
    dto.project_id,
    dto.organization_id,
    trx
  )
  await ensureParentTaskBoundary(dto, trx, dependencies.taskRepository)
  ensureTaskCreationFieldRules(dto)
  await ensureAssigneeBoundary(dto, trx, dependencies.externalDependencies)
}

export async function resolveTaskStatusForCreation(
  dto: CreateTaskDTO,
  trx: TaskTransaction,
  dependencies: Pick<TaskCreatePreconditionDependencies, 'taskStatusRepository'>
): Promise<ResolvedCreateTaskStatus> {
  const selectedStatus = await dependencies.taskStatusRepository.findByIdAndOrgActive(
    dto.task_status_id,
    dto.organization_id,
    trx
  )

  if (!selectedStatus) {
    throw NotFoundException.resource('Task status', dto.task_status_id)
  }

  return selectedStatus
}
