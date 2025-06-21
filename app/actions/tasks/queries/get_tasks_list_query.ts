import UserRepository from '#infra/users/repositories/user_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { TaskPermissionFilter } from '#infra/tasks/repositories/task_repository'
import type GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import type { ExecutionContext } from '#types/execution_context'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type Task from '#models/task'

/**
 * Query để lấy danh sách tasks với filters và permissions
 *
 * Features:
 * - Permission-based filtering (Admin, Org Admin, Member)
 * - Pagination với validation
 * - Filters: task_status_id, priority, label, assigned_to, parent_task, project, search
 * - Sorting: due_date, created_at, updated_at, title, priority
 * - Preload relations
 * - Redis caching (3 minutes)
 * - Statistics: total, by status
 *
 * Permissions:
 * - Admin/Superadmin: Xem tất cả tasks trong organization
 * - Org Admin (role 1,2): Xem tất cả tasks trong organization
 * - Member: Chỉ xem tasks mình tạo hoặc được assign
 */
export default class GetTasksListQuery {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute query
   */
  async execute(dto: GetTasksListDTO): Promise<{
    data: Task[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
      first_page: number
      next_page_url: string | null
      previous_page_url: string | null
    }
    stats?: {
      total: number
      by_status: Record<string, number>
    }
  }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Try cache first
    const cacheKey = dto.getCacheKey()
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Determine permission filter
    const permissionFilter = await this.resolvePermissionFilter(userId, dto.organization_id)

    // Execute with pagination via repository
    const paginator = await TaskRepository.paginateByOrganization(
      dto.organization_id,
      {
        status: dto.hasStatusFilter() ? dto.task_status_id : undefined,
        priority: dto.hasPriorityFilter() ? dto.priority : undefined,
        label: dto.hasLabelFilter() ? dto.label : undefined,
        assigned_to: dto.hasAssigneeFilter() ? dto.assigned_to : undefined,
        parent_task_id: dto.hasParentFilter() ? dto.parent_task_id : undefined,
        project_id: dto.hasProjectFilter() ? dto.project_id : undefined,
        search: dto.hasSearch() ? dto.search : undefined,
        sort_by: dto.sort_by ?? 'due_date',
        sort_order: dto.sort_order ?? 'asc',
        page: dto.page,
        limit: dto.limit,
      },
      permissionFilter
    )

    // Calculate statistics via repository
    const stats = await TaskRepository.getListStatsByOrganization(
      dto.organization_id,
      permissionFilter
    )

    const result = {
      data: paginator.all(),
      meta: {
        total: paginator.total,
        per_page: paginator.perPage,
        current_page: paginator.currentPage,
        last_page: paginator.lastPage,
        first_page: paginator.firstPage,
        next_page_url: paginator.getNextPageUrl(),
        previous_page_url: paginator.getPreviousPageUrl(),
      },
      stats,
    }

    // Cache result
    await this.saveToCache(cacheKey, result, 180) // 3 minutes

    return result
  }

  /**
   * Resolve permission filter
   */
  private async resolvePermissionFilter(
    userId: DatabaseId,
    organizationId: DatabaseId
  ): Promise<TaskPermissionFilter> {
    const isSuperAdmin = await UserRepository.isSystemAdmin(userId)
    if (isSuperAdmin) return { type: 'all' }

    const orgRole = await OrganizationUserRepository.getMemberRoleName(organizationId, userId)

    if (!orgRole) {
      return { type: 'none' }
    }

    if (orgRole === 'org_owner' || orgRole === 'org_admin') {
      return { type: 'all' }
    }

    return { type: 'own_or_assigned', userId }
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<{
    data: Task[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
      first_page: number
      next_page_url: string | null
      previous_page_url: string | null
    }
    stats?: {
      total: number
      by_status: Record<string, number>
    }
  } | null> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached) as {
          data: Task[]
          meta: {
            total: number
            per_page: number
            current_page: number
            last_page: number
            first_page: number
            next_page_url: string | null
            previous_page_url: string | null
          }
          stats?: {
            total: number
            by_status: Record<string, number>
          }
        }
      }
    } catch (error: unknown) {
      loggerService.error('[GetTasksListQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error: unknown) {
      loggerService.error('[GetTasksListQuery] Cache set error:', error)
    }
  }
}
