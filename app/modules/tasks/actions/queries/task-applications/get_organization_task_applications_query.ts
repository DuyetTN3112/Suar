import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  organizationCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { GetOrganizationTaskApplicationsDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type {
  TaskPermissionReader,
  TaskUserReader,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import { hasOrganizationApplicationReviewRole } from '#modules/tasks/actions/task_application_review_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { PaginatedTaskApplicationRecords } from '#modules/tasks/types/task_records'

interface GetOrganizationTaskApplicationsQueryDeps {
  hasOrganizationReviewRole: (
    userId: string,
    organizationId: string | null | undefined
  ) => Promise<boolean>
  paginateByOrganization: TaskLifecycleRepository['paginateApplicationsByOrganization']
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

export default class GetOrganizationTaskApplicationsQuery extends BaseQuery<
  GetOrganizationTaskApplicationsDTO,
  PaginatedTaskApplicationRecords
> {
  private readonly deps: GetOrganizationTaskApplicationsQueryDeps

  constructor(
    execCtx: TaskActionContext,
    permissionReader: TaskPermissionReader,
    lifecycle: TaskLifecycleRepository,
    deps: Partial<GetOrganizationTaskApplicationsQueryDeps> = {},
    private readonly userReader?: Pick<TaskUserReader, 'findUserIdentities'>
  ) {
    super(execCtx)
    this.deps = {
      hasOrganizationReviewRole: (userId, organizationId) =>
        hasOrganizationApplicationReviewRole(
          userId,
          organizationId,
          permissionReader
        ),
      paginateByOrganization: (organizationId, options) =>
        lifecycle.paginateApplicationsByOrganization(organizationId, options),
      resolveCacheKey: (namespaces, logicalKey) =>
        cacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey),
      remember: (cacheKey, ttl, callback) => this.executeWithCache(cacheKey, ttl, callback),
      ...deps,
    }
  }

  async handle(dto: GetOrganizationTaskApplicationsDTO): Promise<PaginatedTaskApplicationRecords> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new ForbiddenException('Authentication required to view organization applications')
    }

    const canReview = await this.deps.hasOrganizationReviewRole(userId, dto.organization_id)
    enforcePolicy(
      canReview
        ? PR.allow()
        : PR.deny('Bạn không có quyền xem danh sách ứng tuyển của tổ chức')
    )

    const logicalCacheKey = this.generateCacheKey('organization:applications', {
      organizationId: dto.organization_id,
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

      const result = await this.deps.paginateByOrganization(dto.organization_id, options)
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
      organizationCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskApplications,
        dto.organization_id
      ),
      logicalCacheKey
    )

    if (cacheKey === null) {
      return resolveApplications()
    }

    return this.deps.remember(cacheKey, 60, resolveApplications)
  }
}
