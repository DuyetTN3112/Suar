import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  globalCacheGenerationNamespaces,
  privateCacheKeyDigest,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { normalizeLegacySnakePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { searchFallbackObserver } from '#modules/search/public_contracts/search_fallback_observer'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { PublicTaskSearchCandidateReader } from '#modules/tasks/actions/ports/outbound/task_search_candidate_readers'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

interface PublicTaskListResult {
  data: TaskDetailRecord[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export interface PublicTaskFilters {
  keyword?: string | null
  task_ids?: string[] | null
  ranked_task_ids?: string[] | null
  difficulty?: string | null
  category_skill_ids?: string[] | null
  skill_ids?: string[] | null
  skill_match?: 'any' | 'all'
  task_type?: string | null
  business_domain?: string | null
  problem_category?: string | null
  role_in_task?: string | null
  verification_method?: string | null
  tech_stack?: string | null
  domain_tags?: string | null
  accepting_applications?: 'open' | 'closed' | null
  sort_by: string
  sort_order: 'asc' | 'desc'
  page: number
  perPage: number
}

interface GetPublicTasksQueryDeps {
  searchCandidateReader: PublicTaskSearchCandidateReader
  resolveSkillIdsByCategoryCodes: (categoryCodes: string[]) => Promise<string[]>
  paginatePublicTasksAsRecords: (
    filters: PublicTaskFilters,
    userId?: string | null,
    trx?: TaskTransaction
  ) => Promise<PublicTaskListResult>
  resolveCacheKey: (namespaces: readonly string[], logicalKey: string) => Promise<string | null>
  getCache: (key: string) => Promise<PublicTaskListResult | null>
  setCache: (key: string, data: PublicTaskListResult, ttl: number) => Promise<void>
}

/**
 * GetPublicTasksQuery
 *
 * Fetches public tasks (marketplace).
 * External contributors can browse and request to join these tasks.
 */
export default class GetPublicTasksQuery extends BaseQuery<
  GetPublicTasksDTO,
  PublicTaskListResult
> {
  private readonly deps: GetPublicTasksQueryDeps

  constructor(execCtx: TaskActionContext, deps: Partial<GetPublicTasksQueryDeps> = {}) {
    super(execCtx)
    if (!deps.searchCandidateReader) {
      throw new InvariantViolationException(
        'GetPublicTasksQuery requires a searchCandidateReader port'
      )
    }
    if (!deps.resolveSkillIdsByCategoryCodes) {
      throw new InvariantViolationException(
        'GetPublicTasksQuery requires a resolveSkillIdsByCategoryCodes port'
      )
    }
    if (!deps.paginatePublicTasksAsRecords) {
      throw new InvariantViolationException(
        'GetPublicTasksQuery requires a paginatePublicTasksAsRecords dependency'
      )
    }
    this.deps = {
      searchCandidateReader: deps.searchCandidateReader,
      resolveSkillIdsByCategoryCodes: deps.resolveSkillIdsByCategoryCodes,
      paginatePublicTasksAsRecords: deps.paginatePublicTasksAsRecords,
      resolveCacheKey: (namespaces, logicalKey) =>
        cacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey),
      getCache: (key) => cacheStore.get<PublicTaskListResult>(key),
      setCache: async (key, data, ttl) => {
        await cacheStore.setBestEffort(key, data, ttl)
      },
      ...deps,
    }
  }

  async handle(dto: GetPublicTasksDTO): Promise<PublicTaskListResult> {
    const userId = this.getCurrentUserId()
    const resolveTasks = async () => {
      const taskIds = await this.resolveEngineTaskIds(dto)
      const categorySkillIds =
        dto.skill_categories && dto.skill_categories.length > 0
          ? await this.deps.resolveSkillIdsByCategoryCodes(dto.skill_categories)
          : null

      return await this.deps.paginatePublicTasksAsRecords(
        {
          keyword: taskIds ? null : dto.keyword,
          task_ids: dto.task_ids ?? taskIds,
          ...(taskIds && !dto.task_ids ? { ranked_task_ids: taskIds } : {}),
          difficulty: dto.difficulty,
          category_skill_ids: categorySkillIds,
          skill_ids: dto.skill_ids,
          ...(dto.skill_match === 'all' ? { skill_match: 'all' as const } : {}),
          task_type: dto.task_type,
          business_domain: dto.business_domain,
          problem_category: dto.problem_category,
          role_in_task: dto.role_in_task,
          verification_method: dto.verification_method,
          tech_stack: dto.tech_stack,
          domain_tags: dto.domain_tags,
          accepting_applications: dto.accepting_applications,
          sort_by: dto.sort_by,
          sort_order: dto.sort_order,
          page: dto.page,
          perPage: dto.per_page,
        },
        userId
      )
    }

    if (userId) {
      return this.normalizeResult(await resolveTasks())
    }

    const cacheVariant = {
      userId: 'anonymous',
      page: dto.page,
      perPage: dto.per_page,
      taskIds: dto.task_ids ? [...dto.task_ids].sort() : null,
      skillCategories: dto.skill_categories ? [...dto.skill_categories].sort() : null,
      skillIds: dto.skill_ids ? [...dto.skill_ids].sort() : null,
      skillMatch: dto.skill_match === 'all' ? 'all' : null,
      keyword: dto.keyword,
      difficultyLevelId: dto.difficulty,
      taskType: dto.task_type,
      businessDomain: dto.business_domain,
      problemCategory: dto.problem_category,
      roleInTask: dto.role_in_task,
      verificationMethod: dto.verification_method,
      techStack: dto.tech_stack,
      domainTags: dto.domain_tags,
      acceptingApplications: dto.accepting_applications,
      sortBy: dto.sort_by,
      sortOrder: dto.sort_order,
    }
    const logicalCacheKey = `tasks:public:v3:query:${privateCacheKeyDigest(
      JSON.stringify(cacheVariant)
    )}`
    const cacheKey = await this.deps.resolveCacheKey(
      globalCacheGenerationNamespaces(CACHE_COLLECTION_GENERATION_NAMESPACES.publicTasks),
      logicalCacheKey
    )
    if (cacheKey === null) {
      return this.normalizeResult(await resolveTasks())
    }

    return await this.executeWithCacheDeps(cacheKey, 120, async () => {
      return await resolveTasks()
    })
  }

  private async resolveEngineTaskIds(dto: GetPublicTasksDTO): Promise<string[] | null> {
    if (!dto.keyword || !this.deps.searchCandidateReader.isEnabled()) {
      return null
    }

    try {
      const limit = Math.max(dto.page * dto.per_page, dto.per_page)
      const results = await this.deps.searchCandidateReader.searchPublicTaskCandidates({
        q: dto.keyword,
        limit,
      })

      if (results.length === 0) {
        return null
      }

      return results.map((result) => result.taskId)
    } catch (error) {
      searchFallbackObserver.record({ surface: 'tasks.public.list', error })
      return null
    }
  }

  private async executeWithCacheDeps(
    cacheKey: string,
    ttl: number,
    callback: () => Promise<PublicTaskListResult>
  ): Promise<PublicTaskListResult> {
    const cached = await this.deps.getCache(cacheKey)
    if (cached !== null) {
      return this.normalizeResult(cached)
    }

    const data = await callback()
    await this.deps.setCache(cacheKey, data, ttl)
    return this.normalizeResult(data)
  }

  private normalizeResult(result: PublicTaskListResult): PublicTaskListResult {
    return {
      ...result,
      meta: normalizeLegacySnakePagination(result.meta),
    }
  }
}
