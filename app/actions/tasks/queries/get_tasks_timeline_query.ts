import UserRepository from '#infra/users/repositories/user_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { TaskPermissionFilter } from '#infra/tasks/repositories/task_repository'
import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { OrganizationRole } from '#constants/organization_constants'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type Task from '#models/task'

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
    const isSuperAdmin = await UserRepository.isSystemAdmin(userId)
    if (isSuperAdmin) return { type: 'all' }

    const orgRole = await OrganizationUserRepository.getMemberRoleName(organizationId, userId)

    if (!orgRole) {
      return { type: 'own_only', userId }
    }

    const isOrgAdmin = orgRole === OrganizationRole.ADMIN || orgRole === OrganizationRole.OWNER

    if (isOrgAdmin) return { type: 'all' }

    return { type: 'own_or_assigned', userId }
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
