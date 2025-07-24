
import { buildTaskCollectionAccessContext } from '#actions/tasks/support/task_permission_context_builder'
import { buildTaskPermissionFilter } from '#actions/tasks/support/task_permission_filter_builder'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { TaskPermissionFilter } from '#infra/tasks/repositories/task_repository'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskDetailRecord } from '#types/task_records'



/**
 * Query để lấy tasks cho Gantt Timeline view
 *
 * Returns tasks with date information for timeline rendering
 * Only returns tasks with due_date set
 */
export default class GetTasksTimelineQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(organizationId: DatabaseId): Promise<TaskDetailRecord[]> {
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

    const tasks = await TaskRepository.findTasksForTimelineAsRecords(organizationId, permissionFilter)

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

  private async getFromCache(key: string): Promise<TaskDetailRecord[] | null> {
    try {
      const cached = await CacheService.get<TaskDetailRecord[]>(key)
      if (cached) return cached
    } catch (error) {
      loggerService.error('[GetTasksTimelineQuery] Cache get error:', error)
    }
    return null
  }

  private async saveToCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await CacheService.set(key, data, ttl)
    } catch (error) {
      loggerService.error('[GetTasksTimelineQuery] Cache set error:', error)
    }
  }
}
