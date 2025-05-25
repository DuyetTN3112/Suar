import type { HttpContext } from '@adonisjs/core/http'
import Task from '#models/task'
import redis from '@adonisjs/redis/services/main'
import db from '@adonisjs/lucid/services/db'

/**
 * Query: Get Organization Tasks
 *
 * Pattern: Filtered list with permissions (learned from Tasks module)
 * Features:
 * - Permission check (must be member)
 * - Filter by status, priority, project, assignee
 * - Search by title/description
 * - Pagination support
 * - Redis caching (2 min TTL)
 * - Load relations: status, priority, assignee, creator, project
 *
 * @example
 * const query = new GetOrganizationTasksQuery(ctx)
 * const result = await query.execute({
 *   organizationId: 1,
 *   statusId: 2,
 *   page: 1,
 *   limit: 20
 * })
 */
export default class GetOrganizationTasksQuery {
  constructor(protected ctx: HttpContext) {}

  async execute(options: {
    organizationId: number
    statusId?: number
    priorityId?: number
    projectId?: number
    assignedTo?: number
    search?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<{
    data: Task[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }> {
    const user = this.ctx.auth.user!
    const {
      organizationId,
      statusId,
      priorityId,
      projectId,
      assignedTo,
      search,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options

    // 1. Validate
    if (limit < 1 || limit > 100) {
      throw new Error('Limit phải từ 1 đến 100')
    }

    // 2. Permission check: User must be member
    const isMember = await this.checkMembership(user.id, organizationId)
    if (!isMember) {
      throw new Error('Bạn không có quyền xem tasks của organization này')
    }

    // 3. Try cache first
    const cacheKey = this.buildCacheKey(options)
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 4. Build query
    const query = Task.query().where('organization_id', organizationId).whereNull('deleted_at')

    // 5. Apply filters
    if (statusId) {
      void query.where('status_id', statusId)
    }

    if (priorityId) {
      void query.where('priority_id', priorityId)
    }

    if (projectId) {
      void query.where('project_id', projectId)
    }

    if (assignedTo) {
      void query.where('assigned_to', assignedTo)
    }

    if (search) {
      void query.where((searchQuery) => {
        void searchQuery
          .whereILike('title', `%${search}%`)
          .orWhereILike('description', `%${search}%`)
      })
    }

    // 6. Preload relations
    void query
      .preload('status')
      .preload('priority')
      .preload('label')
      .preload('assignee', (q) => {
        void q.select(['id', 'username', 'email'])
      })
      .preload('creator', (q) => {
        void q.select(['id', 'username'])
      })
      .preload('project', (q) => {
        void q.select(['id', 'name', 'status_id'])
      })

    // 7. Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'due_date', 'title', 'priority_id']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    void query.orderBy(sortField, sortOrder)

    // 8. Execute with pagination
    const paginator = await query.paginate(page, limit)

    const result = {
      data: paginator.all(),
      meta: {
        total: paginator.total,
        per_page: paginator.perPage,
        current_page: paginator.currentPage,
        last_page: paginator.lastPage,
      },
    }

    // 9. Cache result (2 minutes - more volatile than members)
    await this.saveToCache(cacheKey, result, 120)

    return result
  }

  /**
   * Check if user is member of organization
   */
  private async checkMembership(userId: number, organizationId: number): Promise<boolean> {
    const membership = await db
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .first()

    return !!membership
  }

  /**
   * Build cache key
   */
  private buildCacheKey(options: unknown): string {
    const parts = [
      'organization:tasks',
      `org:${options.organizationId}`,
      `page:${options.page || 1}`,
      `limit:${options.limit || 20}`,
    ]

    if (options.statusId) parts.push(`status:${options.statusId}`)
    if (options.priorityId) parts.push(`priority:${options.priorityId}`)
    if (options.projectId) parts.push(`project:${options.projectId}`)
    if (options.assignedTo) parts.push(`assigned:${options.assignedTo}`)
    if (options.search) parts.push(`search:${options.search}`)
    if (options.sortBy) parts.push(`sort:${options.sortBy}`)
    if (options.sortOrder) parts.push(`order:${options.sortOrder}`)

    return parts.join(':')
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<unknown> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.error('[GetOrganizationTasksQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('[GetOrganizationTasksQuery] Cache set error:', error)
    }
  }
}
