import redis from '@adonisjs/redis/services/main'

import { buildTaskCollectionAccessContext } from '#actions/tasks/support/task_permission_context_builder'
import { buildTaskPermissionFilter } from '#actions/tasks/support/task_permission_filter_builder'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import loggerService from '#infra/logger/logger_service'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { TaskPermissionFilter } from '#infra/tasks/repositories/task_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import type Task from '#models/task'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

/**
 * Query để lấy tasks grouped by status cho Kanban board
 *
 * Returns: Record<status_slug, Task[]> — mỗi status definition là 1 column
 * Permissions: same logic as GetTasksListQuery
 */
export default class GetTasksGroupedQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(organizationId: DatabaseId): Promise<Record<string, Task[]>> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Try cache
    const cacheKey = `tasks:grouped:org:${organizationId}:user:${userId}`
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Determine permission filter
    const permissionFilter = await this.resolvePermissionFilter(userId, organizationId)

    const [tasks, statusDefinitions] = await Promise.all([
      TaskRepository.findRootTasksForKanban(organizationId, permissionFilter),
      TaskStatusRepository.findByOrganization(organizationId),
    ])

    // Group by status
    const grouped: Record<string, Task[]> = {}
    const statusSlugById = new Map<string, string>()

    for (const status of statusDefinitions) {
      grouped[status.slug] = []
      statusSlugById.set(status.id, status.slug)
    }

    for (const task of tasks) {
      const taskStatusSlug = (task as unknown as { taskStatus?: { slug?: string } }).taskStatus
        ?.slug
      const statusKey =
        taskStatusSlug ??
        (task.task_status_id ? statusSlugById.get(task.task_status_id) : undefined) ??
        'unknown'

      grouped[statusKey] ??= [];
      grouped[statusKey].push(task)
    }

    // Cache 2 minutes
    await this.saveToCache(cacheKey, grouped, 120)

    return grouped
  }

  private async resolvePermissionFilter(
    userId: DatabaseId,
    organizationId: DatabaseId
  ): Promise<TaskPermissionFilter> {
    const accessContext = await buildTaskCollectionAccessContext(userId, organizationId, 'own_only')
    return buildTaskPermissionFilter(accessContext)
  }

  private async getFromCache(key: string): Promise<Record<string, Task[]> | null> {
    try {
      const cached = await redis.get(key)
      if (cached) return JSON.parse(cached) as Record<string, Task[]>
    } catch (error) {
      loggerService.error('[GetTasksGroupedQuery] Cache get error:', error)
    }
    return null
  }

  private async saveToCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      loggerService.error('[GetTasksGroupedQuery] Cache set error:', error)
    }
  }
}
