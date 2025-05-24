import Task from '#models/task'
import User from '#models/user'
import GetTasksListDTO from '../dtos/get_tasks_list_dto.js'
import type { HttpContext } from '@adonisjs/core/http'
import redis from '@adonisjs/redis/services/main'
import db from '@adonisjs/lucid/services/db'

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
      throw new Error('User chưa đăng nhập')
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
      query.where((searchQuery) => {
        searchQuery
          .whereILike('title', `%${dto.search}%`)
          .orWhereILike('description', `%${dto.search}%`)
          .orWhere('id', dto.search!)
      })
    }

    // Apply sorting
    query.orderBy(dto.sort_by!, dto.sort_order!)

    // Preload relations
    query
      .preload('status')
      .preload('label')
      .preload('priority')
      .preload('assignee', (assigneeQuery) => {
        assigneeQuery.select(['id', 'username', 'email'])
      })
      .preload('creator', (creatorQuery) => {
        creatorQuery.select(['id', 'username'])
      })
      .preload('parentTask', (parentQuery) => {
        parentQuery.select(['id', 'title', 'status_id']).preload('status')
      })
      .preload('childTasks', (childQuery) => {
        childQuery.whereNull('deleted_at').select(['id', 'title', 'status_id']).preload('status')
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
    query: any,
    user: User,
    organizationId: number
  ): Promise<void> {
    // Load user role
    await user.load('role')

    // Check if user is Admin/Superadmin
    const isSuperAdmin = ['superadmin', 'admin'].includes(user.role?.name?.toLowerCase() || '')

    if (isSuperAdmin) {
      // Admin sees all tasks
      return
    }

    // Check organization role
    const orgUser = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', user.id)
      .first()

    if (!orgUser) {
      // User not in org, no tasks
      query.where('id', -1) // No results
      return
    }

    // Org Owner/Manager (role 1,2) sees all tasks
    if ([1, 2].includes(orgUser.role_id)) {
      return
    }

    // Member: Only tasks created by or assigned to user
    query.where((memberQuery: any) => {
      memberQuery.where('creator_id', user.id).orWhere('assigned_to', user.id)
    })
  }

  /**
   * Apply filters from DTO
   */
  private applyFilters(query: any, dto: GetTasksListDTO): void {
    if (dto.hasStatusFilter()) {
      query.where('status_id', dto.status)
    }

    if (dto.hasPriorityFilter()) {
      query.where('priority_id', dto.priority)
    }

    if (dto.hasLabelFilter()) {
      query.where('label_id', dto.label)
    }

    if (dto.hasAssigneeFilter()) {
      query.where('assigned_to', dto.assigned_to)
    }

    if (dto.hasParentFilter()) {
      if (dto.parent_task_id === null) {
        // Root tasks only
        query.whereNull('parent_task_id')
      } else {
        // Subtasks of specific parent
        query.where('parent_task_id', dto.parent_task_id)
      }
    }

    if (dto.hasProjectFilter()) {
      if (dto.project_id === null) {
        // Tasks without project
        query.whereNull('project_id')
      } else {
        // Tasks in specific project
        query.where('project_id', dto.project_id)
      }
    }
  }

  /**
   * Calculate statistics
   */
  private async calculateStats(
    organizationId: number,
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
    byStatusResults.forEach((row: any) => {
      byStatus[row.status_id] = Number(row.$extras.count)
    })

    return {
      total: Number(total?.$extras.total || 0),
      by_status: byStatus,
    }
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<any> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.error('[GetTasksListQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: any, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('[GetTasksListQuery] Cache set error:', error)
    }
  }
}
