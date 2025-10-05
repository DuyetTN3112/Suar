import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { normalizeLegacySnakePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { PublicTaskSearchCandidateReader } from '#modules/tasks/actions/ports/task_search_candidate_readers'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import * as publicQueries from '#modules/tasks/infra/repositories/read/public_queries'
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

interface GetPublicTasksQueryDeps {
  searchCandidateReader: PublicTaskSearchCandidateReader
  paginatePublicTasksAsRecords: typeof publicQueries.paginatePublicTasksAsRecords
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

  constructor(
    execCtx: TaskActionContext,
    deps: Partial<GetPublicTasksQueryDeps> = {}
  ) {
    super(execCtx)
    if (!deps.searchCandidateReader) {
      throw new Error('GetPublicTasksQuery requires a searchCandidateReader port')
    }
    this.deps = {
      searchCandidateReader: deps.searchCandidateReader,
      paginatePublicTasksAsRecords: publicQueries.paginatePublicTasksAsRecords,
      getCache: (key) => cacheStore.get<PublicTaskListResult>(key),
      setCache: (key, data, ttl) => cacheStore.set(key, data, ttl),
      ...deps,
    }
  }

  async handle(dto: GetPublicTasksDTO): Promise<PublicTaskListResult> {
    const userId = this.getCurrentUserId()
    const resolveTasks = async () => {
      const taskIds = await this.resolveEngineTaskIds(dto)

      return await this.deps.paginatePublicTasksAsRecords(
        {
          keyword: taskIds ? null : dto.keyword,
          task_ids: dto.task_ids ?? taskIds,
          difficulty: dto.difficulty,
          skill_categories: dto.skill_categories,
          skill_ids: dto.skill_ids,
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

    const cacheKey = this.generateCacheKey('tasks:public', {
      userId: 'anonymous',
      page: dto.page,
      perPage: dto.per_page,
      taskIds: dto.task_ids?.join(','),
      skillCategories: dto.skill_categories?.join(','),
      skillIds: dto.skill_ids?.join(','),
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
    })

    return await this.executeWithCacheDeps(cacheKey, 120, async () => {
      return await resolveTasks()
    })
  }

  private async resolveEngineTaskIds(dto: GetPublicTasksDTO): Promise<string[] | null> {
    if (!dto.keyword || !isSearchRuntimeEnabled()) {
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
    } catch {
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
