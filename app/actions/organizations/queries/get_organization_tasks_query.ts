import type { ExecutionContext } from '#types/execution_context'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { TaskPermissionFilter } from '#infra/tasks/repositories/task_repository'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#infra/logger/logger_service'
import type { DatabaseId } from '#types/database'
import type Task from '#models/task'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { PAGINATION } from '#constants/common_constants'
import { buildTaskPermissionFilter } from '#actions/tasks/support/task_permission_filter_builder'
import { buildTaskCollectionAccessContext } from '#actions/tasks/support/task_permission_context_builder'

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
 * - Permission check through task domain read scope
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

    // 2. Resolve permission scope
    const permissionFilter = await this.resolvePermissionFilter(userId, organizationId)

    // 3. Try cache first
    const cacheKey = this.buildCacheKey(options)
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 4. Build query and execute with pagination
    const validSortFields = ['created_at', 'updated_at', 'due_date', 'title', 'priority']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'

    const paginator = await TaskRepository.paginateByOrganization(
      organizationId,
      {
        status: statusId,
        priority: priorityId,
        assigned_to: assignedTo,
        parent_task_id: null,
        project_id: projectId,
        search,
        sort_by: sortField,
        sort_order: sortOrder,
        page,
        limit,
      },
      permissionFilter
    )

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

  private async resolvePermissionFilter(
    userId: DatabaseId,
    organizationId: DatabaseId
  ): Promise<TaskPermissionFilter> {
    const accessContext = await buildTaskCollectionAccessContext(userId, organizationId, 'none')
    return buildTaskPermissionFilter(accessContext)
  }

  /**
   * Build cache key
   */
  private buildCacheKey(options: QueryOptions): string {
    const parts = [
      'organization:tasks',
      `org:${options.organizationId}`,
      `page:${options.page ?? 1}`,
      `limit:${options.limit ?? PAGINATION.DEFAULT_PER_PAGE}`,
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
