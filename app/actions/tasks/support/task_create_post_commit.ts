import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'

import type CreateNotification from '#actions/common/create_notification'
import type CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'
import CacheService from '#infra/cache/cache_service'
import type Task from '#models/task'
import type { DatabaseId } from '#types/database'

import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

async function invalidateTaskCreateCaches(): Promise<void> {
  await CacheService.deleteByPattern('organization:tasks:*')
  await CacheService.deleteByPattern('tasks:public:*')
  await CacheService.deleteByPattern('task:user:*')
}

async function sendTaskAssignmentNotification(
  task: Task,
  creatorId: DatabaseId,
  assigneeId: DatabaseId,
  createNotification: CreateNotification
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
  task: Task,
  dto: CreateTaskDTO,
  creatorId: DatabaseId,
  createNotification: CreateNotification
): Promise<void> {
  void emitter.emit('task:created', {
    task,
    creatorId,
    organizationId: dto.organization_id,
    projectId: dto.project_id,
  })

  await invalidateTaskCreateCaches()

  if (dto.isAssigned() && dto.assigned_to !== undefined) {
    await sendTaskAssignmentNotification(task, creatorId, dto.assigned_to, createNotification)
  }
}
