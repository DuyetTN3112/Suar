import UserRepository from '#infra/users/repositories/user_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import type { TaskPermissionFilter } from '#infra/tasks/repositories/task_repository'
import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type Task from '#models/task'

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

      if (!grouped[statusKey]) {
        grouped[statusKey] = []
      }
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
    const isSuperAdmin = await UserRepository.isSystemAdmin(userId)
    if (isSuperAdmin) return { type: 'all' }

    const orgRole = await OrganizationUserRepository.getMemberRoleName(organizationId, userId)

    if (!orgRole) {
      return { type: 'own_only', userId }
    }

    const isOrgAdmin = orgRole === 'org_admin' || orgRole === 'org_owner'

    if (isOrgAdmin) return { type: 'all' }

    return { type: 'own_or_assigned', userId }
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
