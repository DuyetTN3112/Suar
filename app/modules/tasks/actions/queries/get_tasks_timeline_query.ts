
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#modules/cache/infra/cache_service'
import loggerService from '#modules/logger/infra/logger_service'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { buildTaskPermissionFilter } from '#modules/tasks/actions/support/task_permission_filter_builder'
import * as listQueries from '#modules/tasks/infra/repositories/read/list_queries'
import type { TaskPermissionFilter } from '#modules/tasks/infra/repositories/read/shared'
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

    const tasks = await listQueries.findTasksForTimelineAsRecords(organizationId, permissionFilter)

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
