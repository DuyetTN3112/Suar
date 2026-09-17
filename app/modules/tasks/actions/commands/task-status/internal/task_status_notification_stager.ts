import type UpdateTaskStatusDTO from '../../../dtos/request/update_task_status_dto.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskRecord, TaskStatusRecord } from '#modules/tasks/types/task_records'

export async function stageStatusChangeNotification(
  task: TaskRecord,
  updaterId: string,
  dto: UpdateTaskStatusDTO,
  oldTaskStatusId: string,
  newStatus: TaskStatusRecord,
  deps: TaskExternalDependencies,
  notificationStager: TaskNotificationStager,
  trx: TaskTransaction
): Promise<void> {
  const occurredAt = task.updated_at
  if (!occurredAt) {
    throw new InvariantViolationException(
      'Persisted task status transition is missing its update timestamp'
    )
  }
  const updater = await deps.user.findUserIdentity(updaterId, trx)
  const updaterName = updater?.username ?? updater?.email ?? 'Unknown'
  const reviewerIds = await deps.review.listTaskReviewerIds(task.id, trx)
  const recipients = new Map<string, 'creator' | 'reviewer'>()
  if (task.creator_id && task.creator_id !== updaterId) {
    recipients.set(task.creator_id, 'creator')
  }
  for (const reviewerId of reviewerIds) {
    if (reviewerId !== updaterId && !recipients.has(reviewerId)) {
      recipients.set(reviewerId, 'reviewer')
    }
  }

  for (const [recipientId, audience] of recipients) {
    await notificationStager.stage(
      {
        eventId: buildNotificationEventId({
          eventName: 'task.status_updated',
          businessEventId: `${task.id}:${oldTaskStatusId}:${newStatus.id}:${occurredAt}`,
          recipientId,
        }),
        schemaVersion: 1,
        type: BACKEND_NOTIFICATION_TYPES.TASK_STATUS_UPDATED,
        recipientId,
        scope: { kind: 'organization', id: task.organization_id },
        actor: { type: 'user', id: updaterId },
        subject: {
          type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
          id: task.id,
        },
        parameters: {
          taskTitle: task.title,
          updaterName,
          newStatusName: newStatus.name,
          notificationAudience: audience,
          ...(dto.reason === undefined ? {} : { reason: dto.reason }),
        },
        occurredAt,
        correlationId: `${task.id}:${occurredAt}`,
      },
      { trx }
    )
  }
}
