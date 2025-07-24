
import { buildTaskCollectionAccessContext } from '#actions/tasks/support/task_permission_context_builder'
import { buildTaskPermissionFilter } from '#actions/tasks/support/task_permission_filter_builder'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { TaskPermissionFilter } from '#infra/tasks/repositories/task_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskDetailRecord } from '#types/task_records'

/**
 * Query để lấy tasks grouped by status cho Kanban board
 *
 * Returns: Record<status_slug, Task[]> — mỗi status definition là 1 column
 * Permissions: same logic as GetTasksListQuery
 */
export default class GetTasksGroupedQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(organizationId: DatabaseId): Promise<Record<string, TaskDetailRecord[]>> {
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
      TaskRepository.findRootTasksForKanbanAsRecords(organizationId, permissionFilter),
      TaskStatusRepository.findByOrganization(organizationId),
    ])

    // Group by status
    const grouped: Record<string, TaskDetailRecord[]> = {}
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

  private async getFromCache(key: string): Promise<Record<string, TaskDetailRecord[]> | null> {
    try {
      const cached = await CacheService.get<Record<string, TaskDetailRecord[]>>(key)
      if (cached) return cached
    } catch (error) {
      loggerService.error('[GetTasksGroupedQuery] Cache get error:', error)
    }
    return null
  }

  private async saveToCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await CacheService.set(key, data, ttl)
    } catch (error) {
      loggerService.error('[GetTasksGroupedQuery] Cache set error:', error)
    }
  }
}
