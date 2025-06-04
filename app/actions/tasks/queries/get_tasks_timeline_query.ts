import Task from '#models/task'
import UserRepository from '#repositories/user_repository'
import OrganizationUser from '#models/organization_user'
import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { OrganizationRole } from '#constants/organization_constants'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'

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

    const query = Task.query()
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .whereNull('parent_task_id')
      .whereNotNull('due_date')
      .orderBy('due_date', 'asc')

    // Apply permission filtering
    await this.applyPermissionFilters(query, userId, organizationId)

    // Preload relations
    void query
      .preload('assignee', (q) => void q.select(['id', 'username', 'email']))
      .preload('creator', (q) => void q.select(['id', 'username']))

    const tasks = await query

    // Cache 2 minutes
    await this.saveToCache(cacheKey, tasks, 120)

    return tasks
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
