import type AssignTaskDTO from '../../dtos/request/assign_task_dto.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
  type BackendNotificationType,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskRecord } from '#modules/tasks/types/task_records'

export async function stageAssignmentNotifications(
  task: TaskRecord,
  assignerId: string,
  dto: AssignTaskDTO,
  oldAssignedTo: string | null,
  deps: TaskExternalDependencies,
  notificationStager: TaskNotificationStager,
  trx: TaskTransaction
): Promise<void> {
  const occurredAt = task.updated_at
  if (!occurredAt) {
    throw new InvariantViolationException(
      'Persisted task assignment transition is missing its update timestamp'
    )
  }
  const assigner = await deps.user.findUserIdentity(assignerId, trx)
  const assignerName = assigner?.username ?? assigner?.email ?? 'Unknown'
  const plan: Array<{
    recipientId: string
    type: BackendNotificationType
    eventName: string
    assignmentChange: 'assigned' | 'unassigned' | 'reassigned'
  }> = []

  if (dto.isUnassigning() && oldAssignedTo && oldAssignedTo !== assignerId) {
    plan.push({
      recipientId: oldAssignedTo,
      type: BACKEND_NOTIFICATION_TYPES.TASK_UNASSIGNED,
      eventName: 'task.unassigned',
      assignmentChange: 'unassigned',
    })
  }

  if (dto.isAssigning() && dto.assigned_to !== null && dto.assigned_to !== assignerId) {
    plan.push({
      recipientId: dto.assigned_to,
      type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
      eventName: 'task.assigned',
      assignmentChange: 'assigned',
    })
    if (oldAssignedTo && oldAssignedTo !== dto.assigned_to && oldAssignedTo !== assignerId) {
      plan.push({
        recipientId: oldAssignedTo,
        type: BACKEND_NOTIFICATION_TYPES.TASK_REASSIGNED,
        eventName: 'task.reassigned',
        assignmentChange: 'reassigned',
      })
    }
  }

  for (const notification of plan) {
    await notificationStager.stage(
      {
        eventId: buildNotificationEventId({
          eventName: notification.eventName,
          businessEventId: `${task.id}:${oldAssignedTo ?? 'none'}:${dto.assigned_to ?? 'none'}:${occurredAt}`,
          recipientId: notification.recipientId,
        }),
        schemaVersion: 1,
        type: notification.type,
        recipientId: notification.recipientId,
        scope: { kind: 'organization', id: task.organization_id },
        actor: { type: 'user', id: assignerId },
        subject: {
          type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
          id: task.id,
        },
        parameters: {
          taskTitle: task.title,
          assignerName,
          assignmentChange: notification.assignmentChange,
          ...(dto.reason === undefined ? {} : { reason: dto.reason }),
        },
        occurredAt,
        correlationId: `${task.id}:${occurredAt}`,
      },
      { trx }
    )
  }
}
