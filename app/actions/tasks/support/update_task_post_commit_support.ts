import emitter from '@adonisjs/core/services/emitter'

import type CreateNotification from '#actions/common/create_notification'
import type UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import { BACKEND_NOTIFICATION_ENTITY_TYPES, BACKEND_NOTIFICATION_TYPES } from '#constants/notification_constants'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import type Task from '#models/task'
import type { DatabaseId } from '#types/database'

import type { TaskUserReader } from '../ports/task_external_dependencies.js'
import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

interface TaskUpdateNotificationRequest {
  user_id: DatabaseId
  title: string
  message: string
  type: (typeof BACKEND_NOTIFICATION_TYPES)[keyof typeof BACKEND_NOTIFICATION_TYPES]
  related_entity_type: (typeof BACKEND_NOTIFICATION_ENTITY_TYPES)[keyof typeof BACKEND_NOTIFICATION_ENTITY_TYPES]
  related_entity_id: DatabaseId
}

interface BuildTaskUpdateNotificationRequestsInput {
  task: Pick<Task, 'id' | 'title' | 'assigned_to'>
  updaterId: DatabaseId
  updaterName: string
  dto: Pick<UpdateTaskDTO, 'hasAssigneeChange' | 'isUnassigning'>
  oldAssignedTo: DatabaseId | null
}

interface SendTaskUpdateNotificationsInput extends Omit<BuildTaskUpdateNotificationRequestsInput, 'updaterName'> {
  createNotification: Pick<CreateNotification, 'handle'>
}

interface UpdateTaskPostCommitInput {
  task: Task
  oldAssignedTo: DatabaseId | null
  oldValues: Record<string, unknown>
  changes: { field: string; oldValue: unknown; newValue: unknown }[]
}

export function buildTaskUpdateNotificationRequests(
  input: BuildTaskUpdateNotificationRequestsInput
): TaskUpdateNotificationRequest[] {
  const requests: TaskUpdateNotificationRequest[] = []

  if (input.dto.hasAssigneeChange() && input.task.assigned_to && input.task.assigned_to !== input.oldAssignedTo) {
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

async function invalidateTaskUpdateCaches(taskId: DatabaseId): Promise<void> {
  await CacheService.deleteByPattern(`task:${taskId}:*`)
  await CacheService.deleteByPattern('organization:tasks:*')
  await CacheService.deleteByPattern('task:user:*')
}

export async function runUpdateTaskPostCommitEffects(
  updateResult: UpdateTaskPostCommitInput,
  userId: DatabaseId,
  dto: UpdateTaskDTO,
  createNotification: Pick<CreateNotification, 'handle'>
): Promise<void> {
  void emitter.emit('task:updated', {
    task: updateResult.task,
    updatedBy: userId,
    changes: updateResult.changes,
    previousValues: updateResult.oldValues,
  })

  await invalidateTaskUpdateCaches(updateResult.task.id)
  await sendTaskUpdateNotifications(
    {
      task: updateResult.task,
      updaterId: userId,
      dto,
      oldAssignedTo: updateResult.oldAssignedTo,
      createNotification,
    },
  )
}
