import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  organizationUserCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
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
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

/**
 * Query để lấy tasks grouped by status cho Kanban board
 *
 * Returns: Record<status_slug, Task[]> — mỗi status definition là 1 column
 * Permissions: same logic as GetTasksListQuery
 */
export default class GetTasksGroupedQuery {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private readonly taskReadRepository: Pick<TaskReadRepository, 'findRootTasksForKanban'>,
    private readonly taskStatusRepository: Pick<TaskStatusQueryRepositoryPort, 'findByOrganization'>
  ) {}

  async execute(organizationId: string): Promise<Record<string, TaskDetailRecord[]>> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Resolve permissions before consulting a user-scoped collection cache.
    const permissionFilter = await this.resolvePermissionFilter(userId, organizationId)
    const logicalCacheKey = `tasks:grouped:org:${organizationId}:scope:${permissionFilter.type}:user:${userId}`
    const cacheKey = await cacheStore.resolveVersionedKeyBestEffort(
      organizationUserCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks,
        organizationId,
        userId
      ),
      logicalCacheKey
    )
    const loadFromSource = async (): Promise<Record<string, TaskDetailRecord[]>> => {
      const [taskRecords, statusDefinitions] = await Promise.all([
        this.taskReadRepository.findRootTasksForKanban(organizationId, permissionFilter),
        this.taskStatusRepository.findByOrganization(organizationId),
      ])
      const identityIds = collectTaskUserIdentityIds(taskRecords, false)
      const identities =
        identityIds.length > 0
          ? await this.taskExternalDependencies.user.findUserIdentities(identityIds)
          : []
      const tasks = mapTaskListUserProjections(taskRecords, identities)
      const grouped: Record<string, TaskDetailRecord[]> = {}
      const statusSlugById = new Map<string, string>()

      for (const status of statusDefinitions) {
        grouped[status.slug] = []
        statusSlugById.set(status.id, status.slug)
      }
      for (const task of tasks) {
        const taskStatusSlug = (task as unknown as { taskStatus?: { slug?: string } }).taskStatus
          ?.slug
        const statusKey =
          taskStatusSlug ??
          (task.task_status_id ? statusSlugById.get(task.task_status_id) : undefined) ??
          'unknown'
        grouped[statusKey] ??= []
        grouped[statusKey].push(task)
      }
      return grouped
    }

    return cacheKey
      ? cacheStore.remember(cacheKey, 120, loadFromSource, { waitTimeoutMs: 1_500 })
      : loadFromSource()
  }

  private async resolvePermissionFilter(
    userId: string,
    organizationId: string
  ): Promise<TaskPermissionFilter> {
    const accessContext = await buildTaskCollectionAccessContext(
      userId,
      organizationId,
      'own_only',
      undefined,
      this.taskExternalDependencies.permission
    )
    return buildTaskPermissionFilter(accessContext)
  }
}
