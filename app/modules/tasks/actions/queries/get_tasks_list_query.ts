import type GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import { mapTaskListOutput, type TaskListQueryRecord } from '../mapper/task_query_output_mapper.js'

import {
  taskListCacheGenerationNamespaces,
  type CacheRememberOptions,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore, singleFlight } from '#modules/cache/public_contracts/cache_store'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  normalizeLegacySnakePagination,
  toWindowLimit,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { searchFallbackObserver } from '#modules/search/public_contracts/search_fallback_observer'
import { buildTaskPermissionFilter } from '#modules/tasks/actions/mapper/task_permission_filter_mapper'
import {
  collectTaskUserIdentityIds,
  mapTaskListUserProjections,
} from '#modules/tasks/actions/mapper/task_user_projection_mapper'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskPermissionFilter,
  TaskReadRepository,
} from '#modules/tasks/actions/ports/outbound/task_read_repository'
import type { OrganizationTaskSearchCandidateReader } from '#modules/tasks/actions/ports/outbound/task_search_candidate_readers'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

interface TaskListResult {
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
}

interface GetTasksListQueryDeps {
  searchCandidateReader: OrganizationTaskSearchCandidateReader
  paginateByOrganization: TaskReadRepository['paginateByOrganization']
  getListStatsByOrganization: TaskReadRepository['getListStatsByOrganization']
  resolvePermissionFilter: (userId: string, organizationId: string) => Promise<TaskPermissionFilter>
  resolveCacheKey: (
    namespace: string | readonly string[],
    logicalKey: string
  ) => Promise<string | null>
  rememberCache: <T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>,
    options?: CacheRememberOptions
  ) => Promise<T>
  executeSingleFlight: <T>(key: string, callback: () => Promise<T>) => Promise<T>
}

const TASK_LIST_CACHE_TTL_SECONDS = 180
const TASK_LIST_SINGLE_FLIGHT_WAIT_MS = 1_500

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
    readRepository: Pick<
      TaskReadRepository,
      'paginateByOrganization' | 'getListStatsByOrganization'
    >,
    deps?: Partial<GetTasksListQueryDeps>
  ) {
    if (!deps?.searchCandidateReader) {
      throw new InvariantViolationException(
        'GetTasksListQuery requires a searchCandidateReader port'
      )
    }
    this.deps = {
      searchCandidateReader: deps.searchCandidateReader,
      paginateByOrganization: (...args) => readRepository.paginateByOrganization(...args),
      getListStatsByOrganization: (...args) =>
        readRepository.getListStatsByOrganization(...args),
      resolvePermissionFilter: (userId, organizationId) =>
        this.buildPermissionFilter(userId, organizationId),
      resolveCacheKey: (namespace, logicalKey) =>
        cacheStore.resolveVersionedKeyBestEffort(namespace, logicalKey),
      rememberCache: (key, ttl, callback, options) =>
        cacheStore.remember(key, ttl, callback, options),
      executeSingleFlight: (key, callback) => singleFlight.execute(key, callback),
      ...deps,
    }
  }

  /**
   * Execute query
   */
  async execute(dto: GetTasksListDTO): Promise<TaskListResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Resolve authorization before cache lookup. The resolved scope is part of
    // the key so cached task collections can never cross permission boundaries.
    const permissionFilter = await this.deps.resolvePermissionFilter(userId, dto.organization_id)
    const logicalCacheKey = dto.getCacheKey(permissionFilter)
    const cacheKey = await this.deps.resolveCacheKey(
      taskListCacheGenerationNamespaces(dto.organization_id),
      logicalCacheKey
    )
    const resolveFromSource = () => this.resolveFromSource(dto, permissionFilter)
    const result = cacheKey
      ? await this.deps.rememberCache(cacheKey, TASK_LIST_CACHE_TTL_SECONDS, resolveFromSource, {
          waitTimeoutMs: TASK_LIST_SINGLE_FLIGHT_WAIT_MS,
        })
      : await this.deps.executeSingleFlight(
          `tasks-list:cache-bypass:${logicalCacheKey}`,
          resolveFromSource
        )

    return this.normalizeResult(result)
  }

  private async resolveFromSource(
    dto: GetTasksListDTO,
    permissionFilter: TaskPermissionFilter
  ): Promise<TaskListResult> {
    const taskIds = await this.resolveEngineTaskIds(dto)
    const page = await this.deps.paginateByOrganization(
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
    const stats = await this.deps.getListStatsByOrganization(dto.organization_id, permissionFilter)
    const models = page.data
    const projectIds = [
      ...new Set(models.flatMap((task) => (task.project_id ? [task.project_id] : []))),
    ]
    const projects =
      projectIds.length > 0
        ? await this.taskExternalDependencies.project.findProjectSummaries(projectIds)
        : []
    const projectById = new Map(projects.map((project) => [project.id, project]))
    const mappedTasks = mapTaskListOutput(models)
    const identityIds = collectTaskUserIdentityIds(mappedTasks, false)
    const identities =
      identityIds.length > 0
        ? await this.taskExternalDependencies.user.findUserIdentities(identityIds)
        : []
    const taskRecords = mapTaskListUserProjections(mappedTasks, identities)

    return {
      data: taskRecords.map((task) => {
        const projectId = task['project_id']
        const project = typeof projectId === 'string' ? projectById.get(projectId) : undefined
        return {
          ...task,
          project: project
            ? {
                id: project.id,
                name: project.name,
              }
            : null,
        }
      }),
      meta: {
        total: page.meta.total,
        per_page: page.meta.per_page,
        current_page: page.meta.current_page,
        last_page: page.meta.last_page,
        first_page: page.meta.first_page ?? 1,
        next_page_url: page.meta.next_page_url ?? null,
        previous_page_url: page.meta.previous_page_url ?? null,
      },
      stats,
    }
  }

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

  private async resolveEngineTaskIds(dto: GetTasksListDTO): Promise<string[] | null> {
    if (!dto.hasSearch() || !this.deps.searchCandidateReader.isEnabled()) {
      return null
    }

    try {
      const hits = await this.deps.searchCandidateReader.searchOrganizationTaskCandidates({
        q: dto.search ?? '',
        organizationId: dto.organization_id,
        limit: toWindowLimit(dto.page, dto.limit),
      })

      if (hits.length === 0) {
        return null
      }

      return hits.map((hit) => hit.taskId)
    } catch (error) {
      searchFallbackObserver.record({ surface: 'tasks.organization.list', error })
      return null
    }
  }

  private normalizeResult(result: TaskListResult): TaskListResult {
    const normalizedMeta = normalizeLegacySnakePagination(result.meta)

    return {
      ...result,
      meta: {
        ...normalizedMeta,
        first_page: result.meta.first_page,
        next_page_url: result.meta.next_page_url,
        previous_page_url: result.meta.previous_page_url,
      },
    }
  }
}
