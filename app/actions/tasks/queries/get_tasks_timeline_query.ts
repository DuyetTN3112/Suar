import redis from '@adonisjs/redis/services/main'

import { buildTaskCollectionAccessContext } from '#actions/tasks/support/task_permission_context_builder'
import { buildTaskPermissionFilter } from '#actions/tasks/support/task_permission_filter_builder'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import loggerService from '#infra/logger/logger_service'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { TaskPermissionFilter } from '#infra/tasks/repositories/task_repository'
import type Task from '#models/task'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'



/**
 * Query để lấy tasks cho Gantt Timeline view
 *
 * Returns tasks with date information for timeline rendering
 * Only returns tasks with due_date set
 */
export default class GetTasksTimelineQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(organizationId: DatabaseId): Promise<Task[]> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const cacheKey = `tasks:timeline:org:${organizationId}:user:${userId}`
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Determine permission filter
    const permissionFilter = await this.resolvePermissionFilter(userId, organizationId)

    const tasks = await TaskRepository.findTasksForTimeline(organizationId, permissionFilter)

    // Cache 2 minutes
    await this.saveToCache(cacheKey, tasks, 120)

    return tasks
  }

  private async resolvePermissionFilter(
    userId: DatabaseId,
    organizationId: DatabaseId
  ): Promise<TaskPermissionFilter> {
    const accessContext = await buildTaskCollectionAccessContext(userId, organizationId, 'own_only')
    return buildTaskPermissionFilter(accessContext)
  }

  private async getFromCache(key: string): Promise<Task[] | null> {
    try {
      const cached = await redis.get(key)
      if (cached) return JSON.parse(cached) as Task[]
    } catch (error) {
      loggerService.error('[GetTasksTimelineQuery] Cache get error:', error)
    }
    return null
  }

  private async saveToCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      loggerService.error('[GetTasksTimelineQuery] Cache set error:', error)
    }
  }
}
