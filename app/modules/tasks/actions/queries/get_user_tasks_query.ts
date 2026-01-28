import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  organizationUserCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { TASK_PAGINATION as PAGINATION } from '#modules/tasks/actions/dtos/common/task_pagination'
import type { TaskReadRepository } from '#modules/tasks/actions/ports/outbound/task_read_repository'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

interface UserTaskListResult {
  data: TaskDetailRecord[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

interface GetUserTasksQueryDeps {
  paginateByUserAsRecords: TaskReadRepository['paginateByUser']
  resolveCacheKey: (namespaces: readonly string[], logicalKey: string) => Promise<string | null>
  getCache: (key: string) => Promise<UserTaskListResult | null>
  setCache: (key: string, data: UserTaskListResult, ttl: number) => Promise<void>
}

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
  private readonly deps: GetUserTasksQueryDeps

  constructor(
    readRepository: Pick<TaskReadRepository, 'paginateByUser'>,
    deps: Partial<GetUserTasksQueryDeps> = {}
  ) {
    this.deps = {
      paginateByUserAsRecords: (...args) => readRepository.paginateByUser(...args),
      resolveCacheKey: (namespaces, logicalKey) =>
        cacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey),
      getCache: (key) => cacheStore.get<UserTaskListResult>(key),
      setCache: async (key, data, ttl) => {
        await cacheStore.setBestEffort(key, data, ttl)
      },
      ...deps,
    }
  }

  /**
   * Execute query
   */
  async execute(options: {
    userId: string
    organizationId?: string
    filterType?: 'assigned' | 'created' | 'both' // default: 'both'
    statusId?: string
    priorityId?: string
    page?: number
    limit?: number
  }): Promise<UserTaskListResult> {
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
    if (limit < 1 || limit > PAGINATION.MAX_PER_PAGE) {
      throw new ValidationException('Limit phải từ 1 đến 100')
    }

    // Try cache first
    const logicalCacheKey = this.buildCacheKey(options)
    const cacheKey = await this.deps.resolveCacheKey(
      this.buildGenerationNamespaces(userId, organizationId),
      logicalCacheKey
    )
    if (cacheKey === null) {
      return await this.querySource({
        userId,
        organizationId,
        filterType,
        statusId,
        priorityId,
        page,
        limit,
      })
    }

    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    const result = await this.querySource({
      userId,
      organizationId,
      filterType,
      statusId,
      priorityId,
      page,
      limit,
    })

    // Cache result
    await this.saveToCache(cacheKey, result, 180) // 3 minutes

    return result
  }

  /**
   * Build cache key
   */
  private buildCacheKey(options: {
    userId: string
    organizationId?: string
    filterType?: 'assigned' | 'created' | 'both'
    statusId?: string
    priorityId?: string
    page?: number
    limit?: number
  }): string {
    const parts = [
      'task:user',
      `user:${options.userId}`,
      `org:${options.organizationId ?? 'any'}`,
      `filter:${options.filterType ?? 'both'}`,
    ]

    if (options.statusId) {
      parts.push(`status:${options.statusId}`)
    }

    if (options.priorityId) {
      parts.push(`priority:${options.priorityId}`)
    }

    parts.push(`page:${options.page ?? 1}`)
    parts.push(`limit:${options.limit ?? 10}`)

    return parts.join(':')
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<{
    data: TaskDetailRecord[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  } | null> {
    return this.deps.getCache(key)
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: UserTaskListResult, ttl: number): Promise<void> {
    await this.deps.setCache(key, data, ttl)
  }

  private async querySource(options: {
    userId: string
    organizationId: string | undefined
    filterType: 'assigned' | 'created' | 'both'
    statusId: string | undefined
    priorityId: string | undefined
    page: number
    limit: number
  }): Promise<UserTaskListResult> {
    return await this.deps.paginateByUserAsRecords(
      omitUndefined({
        userId: options.userId,
        organizationId: options.organizationId,
        filterType: options.filterType,
        status: options.statusId,
        priority: options.priorityId,
        page: options.page,
        limit: options.limit,
      })
    )
  }

  private buildGenerationNamespaces(
    userId: string,
    organizationId: string | undefined
  ): readonly string[] {
    if (organizationId) {
      return organizationUserCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
        organizationId,
        userId
      )
    }

    return [CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks, `task:user:user:${userId}`]
  }
}
