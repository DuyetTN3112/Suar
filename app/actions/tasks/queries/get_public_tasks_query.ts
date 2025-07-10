import { BaseQuery } from '#actions/shared/base_query'
import type { GetPublicTasksDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type Task from '#models/task'

interface PublicTaskListResult {
  data: Task[]
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

      const result = await TaskRepository.paginatePublicTasks(
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

      return {
        data: result.all(),
        meta: {
          total: result.total,
          per_page: result.perPage,
          current_page: result.currentPage,
          last_page: result.lastPage,
        },
      }
    })
  }
}
