import Task from '#models/task'
import type { HttpContext } from '@adonisjs/core/http'
import redis from '@adonisjs/redis/services/main'

/**
 * Query để lấy tasks của một user cụ thể
 *
 * Use cases:
 * - Load tasks assigned to user
 * - Load tasks created by user
 * - Load both (default)
 *
 * Features:
 * - Filter: assigned, created, or both
 * - Filter by status, priority
 * - Pagination
 * - Redis caching (3 minutes)
 * - Preload relations
 *
 * Returns: Tasks với pagination
 */
export default class GetUserTasksQuery {
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute query
   */
  async execute(options: {
    userId: number
    organizationId: number
    filterType?: 'assigned' | 'created' | 'both' // default: 'both'
    statusId?: number
    priorityId?: number
    page?: number
    limit?: number
  }): Promise<{
    data: Task[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }> {
    const {
      userId,
      organizationId,
      filterType = 'both',
      statusId,
      priorityId,
      page = 1,
      limit = 10,
    } = options

    // Validate
    if (limit < 1 || limit > 100) {
      throw new Error('Limit phải từ 1 đến 100')
    }

    // Try cache first
    const cacheKey = this.buildCacheKey(options)
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Build query
    const query = Task.query().where('organization_id', organizationId).whereNull('deleted_at')

    // Apply user filter
    if (filterType === 'assigned') {
      void query.where('assigned_to', userId)
    } else if (filterType === 'created') {
      void query.where('creator_id', userId)
    } else {
      // both
      void query.where((bothQuery) => {
        void bothQuery.where('assigned_to', userId).orWhere('creator_id', userId)
      })
    }

    // Apply status filter
    if (statusId) {
      void query.where('status_id', statusId)
    }

    // Apply priority filter
    if (priorityId) {
      void query.where('priority_id', priorityId)
    }

    // Preload relations
    void query
      .preload('status')
      .preload('label')
      .preload('priority')
      .preload('assignee', (q) => {
        void q.select(['id', 'username'])
      })
      .preload('creator', (q) => {
        void q.select(['id', 'username'])
      })
      .preload('project', (q) => {
        void q.select(['id', 'name'])
      })

    // Sort by due date
    void query.orderBy('due_date', 'asc')

    // Execute with pagination
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

    // Cache result
    await this.saveToCache(cacheKey, result, 180) // 3 minutes

    return result
  }

  /**
   * Build cache key
   */
  private buildCacheKey(options: any): string {
    const parts = [
      'task:user',
      `user:${options.userId}`,
      `org:${options.organizationId}`,
      `filter:${options.filterType || 'both'}`,
    ]

    if (options.statusId) {
      parts.push(`status:${options.statusId}`)
    }

    if (options.priorityId) {
      parts.push(`priority:${options.priorityId}`)
    }

    parts.push(`page:${options.page || 1}`)
    parts.push(`limit:${options.limit || 10}`)

    return parts.join(':')
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
      console.error('[GetUserTasksQuery] Cache get error:', error)
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
      console.error('[GetUserTasksQuery] Cache set error:', error)
    }
  }
}
