import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { GetTaskApplicationsDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type {
  TaskPermissionReader,
  TaskUserReader,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import {
  hasOrganizationApplicationReviewRole,
  hasProjectApplicationReviewRole,
} from '#modules/tasks/actions/services/task_application_review_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canProcessApplication } from '#modules/tasks/domain/task_assignment_rules'
import type {
  PaginatedTaskApplicationRecords,
  TaskRecord,
} from '#modules/tasks/types/task_records'

interface GetTaskApplicationsQueryDeps {
  findTask: (taskId: string) => Promise<TaskRecord | null>
  hasProjectReviewRole: (
    userId: string,
    projectId: string | null | undefined
  ) => Promise<boolean>
  hasOrganizationReviewRole: (
    userId: string,
    organizationId: string | null | undefined
  ) => Promise<boolean>
  paginateByTask: TaskLifecycleRepository['paginateApplicationsByTask']
  resolveCacheKey: (
    namespaces: readonly string[],
    logicalKey: string
  ) => Promise<string | null>
  remember: (
    cacheKey: string,
    ttl: number,
    callback: () => Promise<PaginatedTaskApplicationRecords>
  ) => Promise<PaginatedTaskApplicationRecords>
}

/**
 * GetTaskApplicationsQuery
 *
 * Fetches applications for a task.
 * Used by project owners/managers to review applications.
 */
export default class GetTaskApplicationsQuery extends BaseQuery<
  GetTaskApplicationsDTO,
  PaginatedTaskApplicationRecords
> {
  private readonly deps: GetTaskApplicationsQueryDeps

  constructor(
    execCtx: TaskActionContext,
    permissionReader: TaskPermissionReader,
    lifecycle: TaskLifecycleRepository,
    deps: Partial<GetTaskApplicationsQueryDeps> = {},
    private readonly userReader?: Pick<TaskUserReader, 'findUserIdentities'>
  ) {
    super(execCtx)
    this.deps = {
      findTask: (taskId) =>
        lifecycle.findTaskDetail(taskId).catch(() => null),
      hasProjectReviewRole: (userId, projectId) =>
        hasProjectApplicationReviewRole(
          userId,
          projectId,
          permissionReader
        ),
      hasOrganizationReviewRole: (userId, organizationId) =>
        hasOrganizationApplicationReviewRole(
          userId,
          organizationId,
          permissionReader
        ),
      paginateByTask: (taskId, options) =>
        lifecycle.paginateApplicationsByTask(taskId, options),
      resolveCacheKey: (namespaces, logicalKey) =>
        cacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey),
      remember: (cacheKey, ttl, callback) => this.executeWithCache(cacheKey, ttl, callback),
      ...deps,
    }
  }

  async handle(dto: GetTaskApplicationsDTO): Promise<PaginatedTaskApplicationRecords> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new ForbiddenException('Authentication required to view task applications')
    }

    const task = await this.deps.findTask(dto.task_id)
    if (!task) {
      throw new NotFoundException('Task not found')
    }

    const [isProjectOwnerOrManager, isOrganizationOwnerOrAdmin] = await Promise.all([
      this.deps.hasProjectReviewRole(userId, task.project_id),
      this.deps.hasOrganizationReviewRole(userId, task.organization_id),
    ])

    enforcePolicy(
      canProcessApplication({
        actorId: userId,
        taskCreatorId: task.creator_id,
        action: 'reject',
        isTaskAlreadyAssigned: task.assigned_to !== null,
        isProjectOwnerOrManager,
        isOrganizationOwnerOrAdmin,
      })
    )

    const logicalCacheKey = this.generateCacheKey('task:applications', {
      taskId: dto.task_id,
      status: dto.status,
      page: dto.page,
      perPage: dto.per_page,
      userId,
    })

    const resolveApplications = async () => {
      const options: { status?: string; page: number; perPage: number } = {
        page: dto.page,
        perPage: dto.per_page,
      }
      if (dto.status !== undefined) {
        options.status = dto.status
      }

      const result = await this.deps.paginateByTask(dto.task_id, options)
      if (!this.userReader) {
        return result
      }

      const applicantIds = [...new Set(result.data.map((application) => application.applicant_id))]
      if (applicantIds.length === 0) {
        return result
      }
      const identities = await this.userReader.findUserIdentities(applicantIds)
      const identityById = new Map(identities.map((identity) => [identity.id, identity]))

      return {
        ...result,
        data: result.data.map((application) => {
          const applicant = identityById.get(application.applicant_id)
          if (!applicant) {
            return application
          }

          return {
            ...application,
            applicant: {
              id: applicant.id,
              username: applicant.username,
              email: applicant.email,
            },
          }
        }),
      }
    }
    const cacheKey = await this.deps.resolveCacheKey(
      entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskApplications,
        'task',
        dto.task_id
      ),
      logicalCacheKey
    )

    if (cacheKey === null) {
      return resolveApplications()
    }

    return this.deps.remember(cacheKey, 60, resolveApplications)
  }
}
