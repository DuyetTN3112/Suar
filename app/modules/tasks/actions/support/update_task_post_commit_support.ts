import emitter from '@adonisjs/core/services/emitter'

import type { TaskUserReader } from '../ports/task_external_dependencies.js'

import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'

interface TaskUpdateNotificationTarget {
  id: string
  title: string
  assigned_to: string | null
}

interface TaskUpdateNotificationRequest {
  user_id: string
  title: string
  message: string
  type: (typeof BACKEND_NOTIFICATION_TYPES)[keyof typeof BACKEND_NOTIFICATION_TYPES]
  related_entity_type: (typeof BACKEND_NOTIFICATION_ENTITY_TYPES)[keyof typeof BACKEND_NOTIFICATION_ENTITY_TYPES]
  related_entity_id: string
}

interface BuildTaskUpdateNotificationRequestsInput {
  task: TaskUpdateNotificationTarget
  updaterId: string
  updaterName: string
  dto: Pick<UpdateTaskDTO, 'hasAssigneeChange' | 'isUnassigning'>
  oldAssignedTo: string | null
}

interface SendTaskUpdateNotificationsInput extends Omit<
  BuildTaskUpdateNotificationRequestsInput,
  'updaterName'
> {
  createNotification: Pick<NotificationCreator, 'handle'>
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
    input.dto.hasAssigneeChange() &&
    input.task.assigned_to &&
    input.task.assigned_to !== input.oldAssignedTo
  ) {
    if (input.task.assigned_to !== input.updaterId) {
      requests.push({
        user_id: input.task.assigned_to,
        title: 'Bạn có nhiệm vụ mới',
        message: `${input.updaterName} đã giao cho bạn nhiệm vụ: ${input.task.title}`,
        type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
        related_entity_id: input.task.id,
      })
    }
  }

  if (input.dto.isUnassigning() && input.oldAssignedTo && input.oldAssignedTo !== input.updaterId) {
    requests.push({
      user_id: input.oldAssignedTo,
      title: 'Cập nhật nhiệm vụ',
      message: `${input.updaterName} đã bỏ giao nhiệm vụ: ${input.task.title}`,
      type: BACKEND_NOTIFICATION_TYPES.TASK_UPDATED,
      related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
      related_entity_id: input.task.id,
    })
  }

  return requests
}

export async function sendTaskUpdateNotifications(
  input: SendTaskUpdateNotificationsInput,
  userReader: Pick<TaskUserReader, 'findUserIdentity'>
): Promise<void> {
  try {
    const updater = await userReader.findUserIdentity(input.updaterId)
    const updaterName = updater?.username ?? updater?.email ?? 'Unknown'
    const requests = buildTaskUpdateNotificationRequests({
      task: input.task,
      updaterId: input.updaterId,
      updaterName,
      dto: input.dto,
      oldAssignedTo: input.oldAssignedTo,
    })

    for (const request of requests) {
      await input.createNotification.handle(request)
    }
  } catch (error) {
    loggerService.error('[UpdateTaskCommand] Failed to send update notifications', error)
  }
}

export async function runUpdateTaskPostCommitEffects(
  updateResult: UpdateTaskPostCommitInput,
  userId: string,
  dto: UpdateTaskDTO,
  createNotification: Pick<NotificationCreator, 'handle'>,
  userReader: Pick<TaskUserReader, 'findUserIdentity'>,
  cache: TaskCachePort
): Promise<void> {
  void emitter.emit('task:updated', {
    taskId: updateResult.task.id,
    updatedBy: userId,
    changes: updateResult.changes,
    previousValues: updateResult.oldValues,
  })

  await cache.invalidateAfterTaskUpdated(updateResult.task.id)
  await sendTaskUpdateNotifications({
    task: updateResult.task,
    updaterId: userId,
    dto,
    oldAssignedTo: updateResult.oldAssignedTo,
    createNotification,
  }, userReader)
}
