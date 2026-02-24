import type GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import { mapTaskListOutput, type TaskListQueryRecord } from '../mapper/task_query_output_mapper.js'

import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  normalizeLegacySnakePagination,
  toWindowLimit,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { OrganizationTaskSearchCandidateReader } from '#modules/tasks/actions/ports/task_search_candidate_readers'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { buildTaskPermissionFilter } from '#modules/tasks/actions/support/task_permission_filter_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import * as listQueries from '#modules/tasks/infra/repositories/read/list_queries'
import type { TaskPermissionFilter } from '#modules/tasks/infra/repositories/read/task_read_query_helpers'

interface GetTasksListQueryDeps {
  searchCandidateReader: OrganizationTaskSearchCandidateReader
  paginateByOrganization: typeof listQueries.paginateByOrganization
  getListStatsByOrganization: typeof listQueries.getListStatsByOrganization
  resolvePermissionFilter: (userId: string, organizationId: string) => Promise<TaskPermissionFilter>
  getCache: (key: string) => Promise<{
    data: TaskListQueryRecord[]
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
  } | null>
  setCache: (key: string, data: unknown, ttl: number) => Promise<void>
}

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
  private readonly deps: GetTasksListQueryDeps

  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    deps?: Partial<GetTasksListQueryDeps>
  ) {
    if (!deps?.searchCandidateReader) {
      throw new Error('GetTasksListQuery requires a searchCandidateReader port')
    }
    this.deps = {
      searchCandidateReader: deps.searchCandidateReader,
      paginateByOrganization: listQueries.paginateByOrganization,
      getListStatsByOrganization: listQueries.getListStatsByOrganization,
      resolvePermissionFilter: (userId, organizationId) =>
        this.buildPermissionFilter(userId, organizationId),
      getCache: (key) =>
        cacheStore.get<{
          data: TaskListQueryRecord[]
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
        }>(key),
      setCache: (key, data, ttl) => cacheStore.set(key, data, ttl),
      ...deps,
    }
  }

  /**
   * Execute query
   */
  async execute(dto: GetTasksListDTO): Promise<{
    data: TaskListQueryRecord[]
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
      return this.normalizeResult(cached)
    }

    // Determine permission filter
    const permissionFilter = await this.deps.resolvePermissionFilter(userId, dto.organization_id)
    const taskIds = await this.resolveEngineTaskIds(dto)

    // Execute with pagination via repository
    const paginator = await this.deps.paginateByOrganization(
      dto.organization_id,
      omitUndefined({
        status: dto.hasStatusFilter() ? dto.task_status_id : undefined,
        priority: dto.hasPriorityFilter() ? dto.priority : undefined,
        label: dto.hasLabelFilter() ? dto.label : undefined,
        assigned_to: dto.hasAssigneeFilter() ? dto.assigned_to : undefined,
        parent_task_id: dto.hasParentFilter() ? dto.parent_task_id : undefined,
        project_id: dto.hasProjectFilter() ? dto.project_id : undefined,
        project_sprint_id: dto.hasProjectSprintFilter() ? dto.project_sprint_id : undefined,
        task_ids: taskIds ?? undefined,
        search: taskIds ? undefined : dto.hasSearch() ? dto.search : undefined,
        sort_by: dto.sort_by,
        sort_order: dto.sort_order,
        page: dto.page,
        limit: dto.limit,
      }),
      permissionFilter
    )

    // Calculate statistics via repository
    const stats = await this.deps.getListStatsByOrganization(
      dto.organization_id,
      permissionFilter
    )

    const result = {
      data: mapTaskListOutput(paginator.all()),
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

    return this.normalizeResult(result)
  }

  /**
   * Resolve permission filter
   */
  private async buildPermissionFilter(
    userId: string,
    organizationId: string
  ): Promise<TaskPermissionFilter> {
    const accessContext = await buildTaskCollectionAccessContext(
      userId,
      organizationId,
      'none',
      undefined,
      this.taskExternalDependencies.permission
    )
    return buildTaskPermissionFilter(accessContext)
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<{
    data: TaskListQueryRecord[]
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
      const cached = await cacheStore.get<{
        data: TaskListQueryRecord[]
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
      }>(key)
      if (cached) {
        return cached
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
      await cacheStore.set(key, data, ttl)
    } catch (error: unknown) {
      loggerService.error('[GetTasksListQuery] Cache set error:', error)
    }
  }
}
