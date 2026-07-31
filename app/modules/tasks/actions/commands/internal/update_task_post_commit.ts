import {
  BACKEND_NOTIFICATION_TYPES,
  type BackendNotificationType,
} from '#modules/notifications/public_contracts/notification_constants'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/commands/internal/settle_task_post_commit_effects'

interface TaskUpdateNotificationTarget {
  id: string
  organization_id: string
  assigned_to: string | null
}

export interface TaskUpdateNotificationRequest {
  recipientId: string
  type: BackendNotificationType
  eventName: 'task.updated_assigned' | 'task.updated_unassigned'
  assignmentChange: 'assigned' | 'unassigned'
}

interface BuildTaskUpdateNotificationRequestsInput {
  task: TaskUpdateNotificationTarget
  updaterId: string
  hasAssigneeChange: boolean
  isUnassigning: boolean
  oldAssignedTo: string | null
}

interface UpdateTaskPostCommitInput {
  task: TaskUpdateNotificationTarget
  oldAssignedTo: string | null
  oldValues: Record<string, unknown>
  changes: { field: string; oldValue: unknown; newValue: unknown }[]
}

export function buildTaskUpdateNotificationRequests(
  input: BuildTaskUpdateNotificationRequestsInput
): TaskUpdateNotificationRequest[] {
  const requests: TaskUpdateNotificationRequest[] = []

  if (
    input.hasAssigneeChange &&
    input.task.assigned_to &&
    input.task.assigned_to !== input.oldAssignedTo
  ) {
    if (input.task.assigned_to !== input.updaterId) {
      requests.push({
        recipientId: input.task.assigned_to,
        type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
        eventName: 'task.updated_assigned',
        assignmentChange: 'assigned',
      })
    }
  }

  if (input.isUnassigning && input.oldAssignedTo && input.oldAssignedTo !== input.updaterId) {
    requests.push({
      recipientId: input.oldAssignedTo,
      type: BACKEND_NOTIFICATION_TYPES.TASK_UPDATED,
      eventName: 'task.updated_unassigned',
      assignmentChange: 'unassigned',
    })
  }

  return requests
}

export async function runUpdateTaskPostCommitEffects(
  updateResult: UpdateTaskPostCommitInput,
  userId: string,
  cache: TaskCachePort,
  taskEventPublisher: TaskEventPublisher
): Promise<void> {
  await settleTaskPostCommitEffects({
    operation: 'task.update',
    context: {
      taskId: updateResult.task.id,
      actorId: userId,
      organizationId: updateResult.task.organization_id,
    },
    effects: [
      {
        name: `event.task_updated.${updateResult.task.id}`,
        run: () =>
          taskEventPublisher.publishTaskUpdated({
            taskId: updateResult.task.id,
            organizationId: updateResult.task.organization_id,
            updatedBy: userId,
            changes: updateResult.changes,
            previousValues: updateResult.oldValues,
          }),
      },
      {
        name: `cache.task_updated.invalidate_now.${updateResult.task.id}`,
        run: () =>
          cache.invalidateAfterTaskUpdated(
            updateResult.task.id,
            updateResult.task.organization_id
          ),
      },
    ],
  })
}
