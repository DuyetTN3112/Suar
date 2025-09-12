import emitter from '@adonisjs/core/services/emitter'

import type { TaskUserReader } from '../ports/task_external_dependencies.js'
import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

import type { NotificationCreator } from '#actions/notifications/public_api'
import type UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import type { TaskCachePort } from '#actions/tasks/ports/task_cache_port'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'
import { taskCacheAdapter } from '#infra/cache/task_cache_adapter'
import loggerService from '#infra/logger/logger_service'
import type { DatabaseId } from '#types/database'

interface TaskUpdateNotificationTarget {
  id: DatabaseId
  title: string
  assigned_to: DatabaseId | null
}

interface TaskUpdateNotificationRequest {
  user_id: DatabaseId
  title: string
  message: string
  type: (typeof BACKEND_NOTIFICATION_TYPES)[keyof typeof BACKEND_NOTIFICATION_TYPES]
  related_entity_type: (typeof BACKEND_NOTIFICATION_ENTITY_TYPES)[keyof typeof BACKEND_NOTIFICATION_ENTITY_TYPES]
  related_entity_id: DatabaseId
}

interface BuildTaskUpdateNotificationRequestsInput {
  task: TaskUpdateNotificationTarget
  updaterId: DatabaseId
  updaterName: string
  dto: Pick<UpdateTaskDTO, 'hasAssigneeChange' | 'isUnassigning'>
  oldAssignedTo: DatabaseId | null
}

interface SendTaskUpdateNotificationsInput extends Omit<
  BuildTaskUpdateNotificationRequestsInput,
  'updaterName'
> {
  createNotification: Pick<NotificationCreator, 'handle'>
}

interface UpdateTaskPostCommitInput {
  task: TaskUpdateNotificationTarget
  oldAssignedTo: DatabaseId | null
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
  userReader: Pick<TaskUserReader, 'findUserIdentity'> = DefaultTaskDependencies.user
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
  userId: DatabaseId,
  dto: UpdateTaskDTO,
  createNotification: Pick<NotificationCreator, 'handle'>,
  cache: TaskCachePort = taskCacheAdapter
): Promise<void> {
  void emitter.emit('task:updated', {
    taskId: updateResult.task.id,
    updatedBy: userId,
    changes: updateResult.changes,
    previousValues: updateResult.oldValues,
  })

  await cache.invalidateOnTaskUpdate(updateResult.task.id)
  await sendTaskUpdateNotifications({
    task: updateResult.task,
    updaterId: userId,
    dto,
    oldAssignedTo: updateResult.oldAssignedTo,
    createNotification,
  })
}
