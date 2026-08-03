import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  organizationUserCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import { buildTaskPermissionFilter } from '#modules/tasks/actions/mappers/task-reading/task_permission_filter_mapper'
import {
  collectTaskUserIdentityIds,
  mapTaskListUserProjections,
} from '#modules/tasks/actions/mappers/task-reading/task_user_projection_mapper'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskPermissionFilter,
  TaskReadRepository,
} from '#modules/tasks/actions/ports/outbound/task_read_repository'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/task_permission_context'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

/**
 * Query để lấy tasks cho Gantt Timeline view
 *
 * Returns tasks with date information for timeline rendering
 * Only returns tasks with due_date set
 */
type GetTasksTimelineInput = { organizationId: string }
type GetTasksTimelineOutput = TaskDetailRecord[]

export default class GetTasksTimelineQuery extends BaseQuery<
  GetTasksTimelineInput,
  GetTasksTimelineOutput
> {
  constructor(
    execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private readonly taskReadRepository: Pick<TaskReadRepository, 'findTasksForTimeline'>
  ) {
    super(execCtx)
  }

  override executeAndWrap(
    input: GetTasksTimelineInput
  ): ReturnType<BaseQuery<GetTasksTimelineInput, GetTasksTimelineOutput>['executeAndWrap']>
  override executeAndWrap(
    organizationId: string
  ): ReturnType<BaseQuery<GetTasksTimelineInput, GetTasksTimelineOutput>['executeAndWrap']>
  override executeAndWrap(
    inputOrOrganizationId: GetTasksTimelineInput | string
  ): ReturnType<BaseQuery<GetTasksTimelineInput, GetTasksTimelineOutput>['executeAndWrap']> {
    const input = typeof inputOrOrganizationId === 'string'
      ? { organizationId: inputOrOrganizationId }
      : inputOrOrganizationId
    return super.executeAndWrap(input)
  }

  async execute(organizationId: string): Promise<GetTasksTimelineOutput> {
    return this.handle({ organizationId })
  }

  async handle({ organizationId }: GetTasksTimelineInput): Promise<GetTasksTimelineOutput> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Resolve permissions before consulting a user-scoped collection cache.
    const permissionFilter = await this.resolvePermissionFilter(userId, organizationId)
    const logicalCacheKey = `tasks:timeline:org:${organizationId}:scope:${permissionFilter.type}:user:${userId}`
    const cacheKey = await cacheStore.resolveVersionedKeyBestEffort(
      organizationUserCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks,
        organizationId,
        userId
      ),
      logicalCacheKey
    )
    const loadFromSource = async (): Promise<TaskDetailRecord[]> => {
      const taskRecords = await this.taskReadRepository.findTasksForTimeline(
        organizationId,
        permissionFilter
      )
      const identityIds = collectTaskUserIdentityIds(taskRecords, false)
      const identities =
        identityIds.length > 0
          ? await this.taskExternalDependencies.user.findUserIdentities(identityIds)
          : []
      return mapTaskListUserProjections(taskRecords, identities)
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
