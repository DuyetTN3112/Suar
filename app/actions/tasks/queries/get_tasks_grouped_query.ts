import Task from '#models/task'
import UserRepository from '#repositories/user_repository'
import OrganizationUser from '#models/organization_user'
import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { OrganizationRole } from '#constants/organization_constants'
import { TaskStatus } from '#constants/task_constants'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'

/**
 * Query để lấy tasks grouped by status cho Kanban board
 *
 * Returns: Record<TaskStatus, Task[]> — mỗi status là 1 column
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

    const query = Task.query()
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .whereNull('parent_task_id') // Only root tasks for Kanban
      .orderBy('sort_order', 'asc')
      .orderBy('updated_at', 'desc')

    // Apply permission filtering
    await this.applyPermissionFilters(query, userId, organizationId)

    // Preload relations
    void query
      .preload('assignee', (q) => void q.select(['id', 'username', 'email']))
      .preload('creator', (q) => void q.select(['id', 'username']))
      .preload('childTasks', (q) => {
        void q.whereNull('deleted_at').select(['id', 'title', 'status', 'parent_task_id'])
      })

    const tasks = await query

    // Group by status
    const grouped: Record<string, Task[]> = {}
    for (const status of Object.values(TaskStatus)) {
      grouped[status] = []
    }
    for (const task of tasks) {
      const status = task.status
      if (!grouped[status]) {
        grouped[status] = []
      }
      grouped[status].push(task)
    }

    // Cache 2 minutes
    await this.saveToCache(cacheKey, grouped, 120)

    return grouped
  }

  private async applyPermissionFilters(
    query: ReturnType<typeof Task.query>,
    userId: DatabaseId,
    organizationId: DatabaseId
  ): Promise<void> {
    const isSuperAdmin = await UserRepository.isSystemAdmin(userId)
    if (isSuperAdmin) return

    const membership = await OrganizationUser.query()
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .where('status', 'approved')
      .first()

    if (!membership) {
      void query.where('creator_id', userId)
      return
    }

    const isOrgAdmin =
      membership.org_role === OrganizationRole.ADMIN ||
      membership.org_role === OrganizationRole.OWNER

    if (!isOrgAdmin) {
      void query.where((q) => {
        void q.where('creator_id', userId).orWhere('assigned_to', userId)
      })
    }
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
