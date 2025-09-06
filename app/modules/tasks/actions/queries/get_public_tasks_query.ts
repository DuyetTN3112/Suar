import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
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

/**
 * GetPublicTasksQuery
 *
 * Fetches public tasks (marketplace).
 * Freelancers can browse and apply to these tasks.
 */
export default class GetPublicTasksQuery extends BaseQuery<
  GetPublicTasksDTO,
  PublicTaskListResult
> {
  async handle(dto: GetPublicTasksDTO): Promise<PublicTaskListResult> {
    const cacheKey = this.generateCacheKey('tasks:public', {
      userId: this.getCurrentUserId() ?? 'anonymous',
      page: dto.page,
      perPage: dto.per_page,
      skillIds: dto.skill_ids?.join(','),
      keyword: dto.keyword,
      difficultyLevelId: dto.difficulty,
      minBudget: dto.min_budget,
      maxBudget: dto.max_budget,
      sortBy: dto.sort_by,
      sortOrder: dto.sort_order,
    })

    return await this.executeWithCache(cacheKey, 120, async () => {
      const userId = this.getCurrentUserId()

      return await publicQueries.paginatePublicTasksAsRecords(
        {
          keyword: dto.keyword,
          difficulty: dto.difficulty,
          min_budget: dto.min_budget,
          max_budget: dto.max_budget,
          skill_ids: dto.skill_ids,
          sort_by: dto.sort_by,
          sort_order: dto.sort_order,
          page: dto.page,
          perPage: dto.per_page,
        },
        userId
      )
    })
  }
}
