import type UpdateTaskStatusDTO from '../../../dtos/request/update_task_status_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { buildTaskPermissionContext } from '#modules/tasks/actions/task_permission_context'
import { canUpdateTaskStatus } from '#modules/tasks/domain/task-assignment/task_permission_policy'
import {
  validateDocumentationTaskStatusTransition,
  validateWorkflowTransition,
} from '#modules/tasks/domain/task-status/task_status_rules'
import type { TaskRecord, TaskStatusRecord } from '#modules/tasks/types/task_records'

export async function resolveNewStatus(
  task: TaskRecord,
  dto: UpdateTaskStatusDTO,
  deps: TaskExternalDependencies,
  trx: TaskTransaction
): Promise<TaskStatusRecord> {
  const newStatus = await deps.lifecycle.findActiveStatus(
    dto.task_status_id,
    task.organization_id,
    trx,
    task.project_id ?? undefined
  )

  if (!newStatus) {
    throw NotFoundException.resource('Task status', dto.task_status_id)
  }

  return newStatus
}

export async function ensureStatusUpdatePermission(
  task: TaskRecord,
  dto: UpdateTaskStatusDTO,
  userId: string,
  newStatus: TaskStatusRecord,
  deps: TaskExternalDependencies,
  trx: TaskTransaction
): Promise<string> {
  const currentStatusId = task.task_status_id
  if (!currentStatusId) {
    throw new PersistedDataIntegrityException(
      'Persisted task is missing task_status_id required for a status transition',
      {
        taskId: task.id,
        organizationId: task.organization_id,
      }
    )
  }

  if (currentStatusId !== newStatus.id && newStatus.category === 'done' && !task.assigned_to) {
    throw new BusinessLogicException(
      'Không thể chuyển Task sang Done khi chưa có người thực hiện'
    )
  }

  const currentStatus = await deps.lifecycle.findActiveStatus(
    currentStatusId,
    task.organization_id,
    trx,
    task.project_id ?? undefined
  )
  if (!currentStatus) {
    throw new PersistedDataIntegrityException(
      'Persisted task references an unavailable task status',
      {
        taskId: task.id,
        taskStatusId: currentStatusId,
      }
    )
  }

  const permissionContext = await buildTaskPermissionContext(
    userId,
    { ...task, project_id: task.project_id ?? null },
    trx,
    deps.permission,
    deps.activeAssignmentReader
  )
  enforcePolicy(canUpdateTaskStatus(permissionContext))
  enforcePolicy(
    validateDocumentationTaskStatusTransition({
      currentStatus,
      nextStatus: newStatus,
      isAssigned: task.assigned_to !== null,
    })
  )

  const transitions =
    await deps.lifecycle.findWorkflowTransitionsFromStatus(
      task.organization_id,
      currentStatusId,
      trx,
      task.project_id ?? undefined
    )
  const organizationTransitions =
    transitions.length > 0
      ? transitions
      : await deps.lifecycle.listWorkflowTransitions(
          task.organization_id,
          trx,
          task.project_id ?? undefined
        )
  const workflowConfigured = transitions.length > 0 || organizationTransitions.length > 0
  const matchingTransition = transitions.find(
    (transition) => transition.to_status_id === dto.task_status_id
  )

  enforcePolicy(
    validateWorkflowTransition({
      currentStatusId,
      newStatusId: dto.task_status_id,
      allowedTargetIds: transitions.map((transition) => transition.to_status_id),
      workflowConfigured,
      conditions: matchingTransition?.conditions ?? {},
      isAssigned: task.assigned_to !== null,
    })
  )

  return currentStatusId
}
