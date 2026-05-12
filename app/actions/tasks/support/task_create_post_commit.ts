import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'

import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

import type { NotificationCreator } from '#actions/notifications/public_api'
import type CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import type { TaskCachePort } from '#actions/tasks/ports/task_cache_port'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'
import { taskCacheAdapter } from '#infra/cache/task_cache_adapter'
import type { DatabaseId } from '#types/database'
import type { TaskRecord } from '#types/task_records'

async function sendTaskAssignmentNotification(
  task: TaskRecord,
  creatorId: DatabaseId,
  assigneeId: DatabaseId,
  createNotification: NotificationCreator
): Promise<void> {
  try {
    if (assigneeId === creatorId) {
      return
    }

    const [assignee, creator] = await Promise.all([
      DefaultTaskDependencies.user.findUserIdentity(assigneeId),
      DefaultTaskDependencies.user.findUserIdentity(creatorId),
    ])

    if (!assignee) {
      logger.warn(`[CreateTaskCommand] Assignee user not found: ${assigneeId}`)
      return
    }

    if (!creator) {
      logger.warn(`[CreateTaskCommand] Creator user not found: ${creatorId}`)
      return
    }

    await createNotification.handle({
      user_id: assignee.id,
      title: 'Bạn có nhiệm vụ mới',
      message: `${creator.username} đã giao cho bạn nhiệm vụ mới: ${task.title}`,
      type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
      related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
      related_entity_id: task.id,
    })

    logger.info(`[CreateTaskCommand] Notification sent to user ${assigneeId} for task ${task.id}`)
  } catch (error) {
    logger.error('[CreateTaskCommand] Failed to send assignment notification', { error })
  }
}

export async function runTaskCreatedPostCommitEffects(
  task: TaskRecord,
  dto: CreateTaskDTO,
  creatorId: DatabaseId,
  createNotification: NotificationCreator,
  cache: TaskCachePort = taskCacheAdapter
): Promise<void> {
  void emitter.emit('task:created', {
    taskId: task.id,
    creatorId,
    organizationId: dto.organization_id,
    projectId: dto.project_id,
  })

  await cache.invalidateOnTaskCreate()

  if (dto.isAssigned() && dto.assigned_to !== undefined) {
    await sendTaskAssignmentNotification(task, creatorId, dto.assigned_to, createNotification)
  }
}
