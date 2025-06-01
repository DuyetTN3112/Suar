import type { ExecutionContext } from '#types/execution_context'
import Task from '#models/task'
import OrganizationUser from '#models/organization_user'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import { PAGINATION } from '#constants/common_constants'

interface QueryOptions {
  organizationId: DatabaseId
  statusId?: DatabaseId
  priorityId?: DatabaseId
  projectId?: DatabaseId
  assignedTo?: DatabaseId
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface PaginatedResult {
  data: Task[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

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
  constructor(protected execCtx: ExecutionContext) {}

  async execute(options: QueryOptions): Promise<PaginatedResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const {
      organizationId,
      statusId,
      priorityId,
      projectId,
      assignedTo,
      search,
      page = 1,
      limit = PAGINATION.DEFAULT_PER_PAGE,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options

    // 1. Validate
    if (limit < 1 || limit > PAGINATION.MAX_PER_PAGE) {
      throw new BusinessLogicException('Limit phải từ 1 đến 100')
    }

    // 2. Permission check: User must be member
    const isMember = await this.checkMembership(userId, organizationId)
    if (!isMember) {
      throw new ForbiddenException('Bạn không có quyền xem tasks của organization này')
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
      void query.where('status', statusId)
    }

    if (priorityId) {
      void query.where('priority', priorityId)
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

    // 6. Preload relations (v3: status/priority/label are inline columns)
    void query
      .preload('assignee', (q) => {
        void q.select(['id', 'username', 'email'])
      })
      .preload('creator', (q) => {
        void q.select(['id', 'username'])
      })
      .preload('project', (q) => {
        void q.select(['id', 'name', 'status'])
      })

    // 7. Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'due_date', 'title', 'priority']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    void query.orderBy(sortField, sortOrder)

    // 8. Execute with pagination
    const paginator = await query.paginate(page, limit)

    const result: PaginatedResult = {
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
  private async checkMembership(userId: DatabaseId, organizationId: DatabaseId): Promise<boolean> {
    return OrganizationUser.isMember(userId, organizationId)
  }

  /**
   * Build cache key
   */
  private buildCacheKey(options: QueryOptions): string {
    const parts = [
      'organization:tasks',
      `org:${String(options.organizationId)}`,
      `page:${String(options.page ?? 1)}`,
      `limit:${String(options.limit ?? PAGINATION.DEFAULT_PER_PAGE)}`,
    ]

    if (options.statusId) parts.push(`status:${String(options.statusId)}`)
    if (options.priorityId) parts.push(`priority:${String(options.priorityId)}`)
    if (options.projectId) parts.push(`project:${String(options.projectId)}`)
    if (options.assignedTo) parts.push(`assigned:${String(options.assignedTo)}`)
    if (options.search) parts.push(`search:${options.search}`)
    if (options.sortBy) parts.push(`sort:${options.sortBy}`)
    if (options.sortOrder) parts.push(`order:${options.sortOrder}`)

    return parts.join(':')
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<PaginatedResult | null> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached) as PaginatedResult
      }
    } catch (error) {
      loggerService.error('[GetOrganizationTasksQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: PaginatedResult, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      loggerService.error('[GetOrganizationTasksQuery] Cache set error:', error)
    }
  }
}
