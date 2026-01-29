import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { PaginatedTaskApplicationRecords } from '#modules/tasks/types/task_records'

export interface GetMyApplicationsInput {
  status?: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'all'
  page: number
  per_page: number
}

interface GetMyApplicationsQueryDeps {
  paginateByApplicant: TaskLifecycleRepository['paginateApplicationsByApplicant']
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
 * GetMyApplicationsQuery
 *
 * Fetches applications submitted by the current user.
 * Used by external contributors to track their applications.
 */
export default class GetMyApplicationsQuery extends BaseQuery<
  GetMyApplicationsInput,
  PaginatedTaskApplicationRecords
> {
  private readonly deps: GetMyApplicationsQueryDeps

  constructor(
    execCtx: TaskActionContext,
    lifecycle: TaskLifecycleRepository,
    deps: Partial<GetMyApplicationsQueryDeps> = {}
  ) {
    super(execCtx)
    this.deps = {
      paginateByApplicant: (applicantId, options) =>
        lifecycle.paginateApplicationsByApplicant(applicantId, options),
      resolveCacheKey: (namespaces, logicalKey) =>
        cacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey),
      remember: (cacheKey, ttl, callback) => this.executeWithCache(cacheKey, ttl, callback),
      ...deps,
    }
  }

  async handle(dto: GetMyApplicationsInput): Promise<PaginatedTaskApplicationRecords> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    const logicalCacheKey = this.generateCacheKey('user:applications', {
      userId,
      status: dto.status,
      page: dto.page,
      perPage: dto.per_page,
    })

    const resolveApplications = async () => {
      const options: { status?: string; page: number; perPage: number } = {
        page: dto.page,
        perPage: dto.per_page,
      }
      if (dto.status !== undefined) {
        options.status = dto.status
      }

      return this.deps.paginateByApplicant(userId, options)
    }
    const cacheKey = await this.deps.resolveCacheKey(
      entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.userApplications,
        'user',
        userId
      ),
      logicalCacheKey
    )

    if (cacheKey === null) {
      return resolveApplications()
    }

    return this.deps.remember(cacheKey, 60, resolveApplications)
  }
}
