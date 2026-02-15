import Task from '#models/task'
import type User from '#models/user'
import type GetTasksListDTO from '../dtos/get_tasks_list_dto.js'
import type { HttpContext } from '@adonisjs/core/http'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import redis from '@adonisjs/redis/services/main'
import db from '@adonisjs/lucid/services/db'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'

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
  constructor(protected ctx: HttpContext) {}

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
    const user = this.ctx.auth.user
    if (!user) {
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
    await this.applyPermissionFilters(query, user, dto.organization_id)

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

    // Preload relations
    void query
      .preload('status')
      .preload('label')
      .preload('priority')
      .preload('assignee', (assigneeQuery) => {
        void assigneeQuery.select(['id', 'username', 'email'])
      })
      .preload('creator', (creatorQuery) => {
        void creatorQuery.select(['id', 'username'])
      })
      .preload('parentTask', (parentQuery) => {
        void parentQuery.select(['id', 'title', 'status_id'])
        void parentQuery.preload('status')
      })
      .preload('childTasks', (childQuery) => {
        void childQuery.whereNull('deleted_at')
        void childQuery.select(['id', 'title', 'status_id'])
        void childQuery.preload('status')
      })

    // Execute with pagination
    const paginator = await query.paginate(dto.page, dto.limit)

    // Calculate statistics
    const stats = await this.calculateStats(dto.organization_id, user)

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
   * Apply permission-based filters
   */
  private async applyPermissionFilters(
    query: ModelQueryBuilderContract<typeof Task>,
    user: User,
    organizationId: DatabaseId
  ): Promise<void> {
    // Load user system_role
    await user.load('system_role')

    // Check if user is Admin/Superadmin
    // Note: system_role_id is NOT NULL DEFAULT '3' in DB, so system_role will always exist after load
    const isSuperAdmin = ['superadmin', 'admin'].includes(user.system_role.name.toLowerCase())

    if (isSuperAdmin) {
      // Admin sees all tasks
      return
    }

    // Check organization role
    const orgUser = (await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', user.id)
      .first()) as { role_id: number } | null

    if (!orgUser) {
      // User not in org, no tasks
      void query.where('id', -1) // No results
      return
    }

    // Org Owner/Manager (role 1,2) sees all tasks
    if ([1, 2].includes(orgUser.role_id)) {
      return
    }

    // Member: Only tasks created by or assigned to user
    void query.where((memberQuery) => {
      void memberQuery.where('creator_id', user.id).orWhere('assigned_to', user.id)
    })
  }

  /**
   * Apply filters from DTO
   */
  private applyFilters(query: ModelQueryBuilderContract<typeof Task>, dto: GetTasksListDTO): void {
    if (dto.hasStatusFilter() && dto.status) {
      void query.where('status_id', dto.status)
    }

    if (dto.hasPriorityFilter() && dto.priority) {
      void query.where('priority_id', dto.priority)
    }

    if (dto.hasLabelFilter() && dto.label) {
      void query.where('label_id', dto.label)
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
    user: User
  ): Promise<{ total: number; by_status: Record<string, number> }> {
    const baseQuery = Task.query().where('organization_id', organizationId).whereNull('deleted_at')

    // Apply same permission filters
    await this.applyPermissionFilters(baseQuery, user, organizationId)

    // Total count
    const total = await baseQuery.clone().count('* as total').first()

    // Count by status
    const byStatusResults = await baseQuery
      .clone()
      .select('status_id')
      .count('* as count')
      .groupBy('status_id')

    const byStatus: Record<string, number> = {}
    byStatusResults.forEach((row) => {
      const statusId = row.status_id
      const count = row.$extras.count as number
      byStatus[String(statusId)] = count
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
