import Task from '#models/task'
import User from '#models/user'
import OrganizationUser from '#models/organization_user'
import type GetTasksListDTO from '../dtos/get_tasks_list_dto.js'
import type { ExecutionContext } from '#types/execution_context'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { OrganizationRole } from '#constants/organization_constants'

/**
 * Query để lấy danh sách tasks với filters và permissions
 *
 * Features:
 * - Permission-based filtering (Admin, Org Admin, Member)
 * - Pagination với validation
 * - Filters: status, priority, label, assigned_to, parent_task, project, search
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

    // Build query
    const query = Task.query().where('organization_id', dto.organization_id).whereNull('deleted_at')

    // Apply permission filtering
    await this.applyPermissionFilters(query, userId, dto.organization_id)

    // Apply filters
    this.applyFilters(query, dto)

    // Apply search
    if (dto.hasSearch()) {
      const searchTerm = dto.search ?? ''
      void query.where((searchQuery) => {
        void searchQuery
          .whereILike('title', `%${searchTerm}%`)
          .orWhereILike('description', `%${searchTerm}%`)
          .orWhere('id', searchTerm)
      })
    }

    // Apply sorting
    const sortBy = dto.sort_by ?? 'due_date'
    void query.orderBy(sortBy, dto.sort_order ?? 'asc')

    // Preload relations (v3: status/label/priority are inline columns, no preload)
    void query
      .preload('assignee', (assigneeQuery) => {
        void assigneeQuery.select(['id', 'username', 'email'])
      })
      .preload('creator', (creatorQuery) => {
        void creatorQuery.select(['id', 'username'])
      })
      .preload('parentTask', (parentQuery) => {
        void parentQuery.select(['id', 'title', 'status'])
      })
      .preload('childTasks', (childQuery) => {
        void childQuery.whereNull('deleted_at')
        void childQuery.select(['id', 'title', 'status'])
      })

    // Execute with pagination
    const paginator = await query.paginate(dto.page, dto.limit)

    // Calculate statistics
    const stats = await this.calculateStats(dto.organization_id, userId)

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
   * Apply permission-based filters → delegate to Model
   */
  private async applyPermissionFilters(
    query: ModelQueryBuilderContract<typeof Task>,
    userId: DatabaseId,
    organizationId: DatabaseId
  ): Promise<void> {
    // Check if user is Admin/Superadmin → delegate to Model
    const isSuperAdmin = await User.isSystemAdmin(userId)

    if (isSuperAdmin) {
      // Admin sees all tasks
      return
    }

    // Check organization role → delegate to Model
    const orgRole = await OrganizationUser.getOrgRole(userId, organizationId)

    if (!orgRole) {
      // User not in org, no tasks
      void query.where('id', -1) // No results
      return
    }

    // Org Owner/Admin sees all tasks
    if ([OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(String(orgRole) as OrganizationRole)) {
      return
    }

    // Member: Only tasks created by or assigned to user
    void query.where((memberQuery) => {
      void memberQuery.where('creator_id', userId).orWhere('assigned_to', userId)
    })
  }

  /**
   * Apply filters from DTO
   */
  private applyFilters(query: ModelQueryBuilderContract<typeof Task>, dto: GetTasksListDTO): void {
    if (dto.hasStatusFilter() && dto.status) {
      void query.where('status', dto.status)
    }

    if (dto.hasPriorityFilter() && dto.priority) {
      void query.where('priority', dto.priority)
    }

    if (dto.hasLabelFilter() && dto.label) {
      void query.where('label', dto.label)
    }

    if (dto.hasAssigneeFilter() && dto.assigned_to) {
      void query.where('assigned_to', dto.assigned_to)
    }

    if (dto.hasParentFilter()) {
      if (dto.parent_task_id === null) {
        // Root tasks only
        void query.whereNull('parent_task_id')
      } else if (dto.parent_task_id) {
        // Subtasks of specific parent
        void query.where('parent_task_id', dto.parent_task_id)
      }
    }

    if (dto.hasProjectFilter()) {
      if (dto.project_id === null) {
        // Tasks without project
        void query.whereNull('project_id')
      } else if (dto.project_id) {
        // Tasks in specific project
        void query.where('project_id', dto.project_id)
      }
    }
  }

  /**
   * Calculate statistics
   */
  private async calculateStats(
    organizationId: DatabaseId,
    userId: DatabaseId
  ): Promise<{ total: number; by_status: Record<string, number> }> {
    const baseQuery = Task.query().where('organization_id', organizationId).whereNull('deleted_at')

    // Apply same permission filters
    await this.applyPermissionFilters(baseQuery, userId, organizationId)

    // Total count
    const total = await baseQuery.clone().count('* as total').first()

    // Count by status
    const byStatusResults = await baseQuery
      .clone()
      .select('status')
      .count('* as count')
      .groupBy('status')

    const byStatus: Record<string, number> = {}
    byStatusResults.forEach((row) => {
      const status = row.status
      const count = row.$extras.count as number
      byStatus[String(status)] = count
    })

    return {
      total: Number(total?.$extras.total || 0),
      by_status: byStatus,
    }
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
