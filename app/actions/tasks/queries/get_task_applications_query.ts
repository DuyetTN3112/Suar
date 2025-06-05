import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import TaskApplicationRepository from '#repositories/task_application_repository'
import type TaskApplication from '#models/task_application'
import type { GetTaskApplicationsDTO } from '#actions/tasks/dtos/request/task_application_dtos'

interface ApplicationListResult {
  data: TaskApplication[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

/**
 * GetTaskApplicationsQuery
 *
 * Fetches applications for a task.
 * Used by project owners to review applications.
 */
export default class GetTaskApplicationsQuery extends BaseQuery<
  GetTaskApplicationsDTO,
  ApplicationListResult
> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: GetTaskApplicationsDTO): Promise<ApplicationListResult> {
    const cacheKey = this.generateCacheKey('task:applications', {
      taskId: dto.task_id,
      status: dto.status,
      page: dto.page,
    })

    return await this.executeWithCache(cacheKey, 60, async () => {
      const result = await TaskApplicationRepository.paginateByTask(dto.task_id, {
        status: dto.status,
        page: dto.page,
        perPage: dto.per_page,
      })

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
