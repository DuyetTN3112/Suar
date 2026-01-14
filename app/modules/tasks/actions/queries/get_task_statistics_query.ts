import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  organizationUserCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { buildTaskPermissionFilter } from '#modules/tasks/actions/mapper/task_permission_filter_mapper'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskPermissionFilter,
  TaskReadRepository,
} from '#modules/tasks/actions/ports/outbound/task_read_repository'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

/**
 * Query để lấy statistics của tasks
 *
 * Returns:
 * - Total tasks
 * - Count by status
 * - Count by priority
 * - Count by label
 * - Overdue tasks count
 * - Completed this week/month
 * - Average completion time (days)
 * - Time tracking stats (estimated vs actual)
 *
 * Features:
 * - Permission-based filtering
 * - Redis caching (5 minutes)
 */
export default class GetTaskStatisticsQuery {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private readonly taskReadRepository: Pick<TaskReadRepository, 'getStatisticsByOrganization'>
  ) {}

  /**
   * Execute query
   */
  async execute(organizationId: string): Promise<{
    total: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
    byLabel: Record<string, number>
    overdue: number
    completedThisWeek: number
    completedThisMonth: number
    avgCompletionDays: number | null
    timeTracking: {
      tasksWithEstimate: number
      tasksWithActual: number
      totalEstimated: number
      totalActual: number
      avgEstimated: number
      avgActual: number
      efficiency: number | null // actual/estimated ratio
    }
  }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Resolve permissions before consulting a user-scoped collection cache.
    const permissionFilter = await this.resolvePermissionFilter(userId, organizationId)
    const logicalCacheKey = `task:stats:org:${organizationId}:scope:${permissionFilter.type}:user:${userId}`
    const cacheKey = await cacheStore.resolveVersionedKeyBestEffort(
      organizationUserCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics,
        organizationId,
        userId
      ),
      logicalCacheKey
    )
    const loadFromSource = () =>
      this.taskReadRepository.getStatisticsByOrganization(organizationId, permissionFilter)

    return cacheKey
      ? cacheStore.remember(cacheKey, 300, loadFromSource, { waitTimeoutMs: 1_500 })
      : loadFromSource()
  }

  /**
   * Resolve permission filter for the current user
   */
  private async resolvePermissionFilter(
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
}
