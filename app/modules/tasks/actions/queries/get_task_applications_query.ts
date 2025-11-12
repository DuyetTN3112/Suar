import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { GetTaskApplicationsDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import type { PaginatedTaskApplicationRecords } from '#modules/tasks/types/task_records'

/**
 * GetTaskApplicationsQuery
 *
 * Fetches applications for a task.
 * Used by project owners to review applications.
 */
export default class GetTaskApplicationsQuery extends BaseQuery<
  GetTaskApplicationsDTO,
  PaginatedTaskApplicationRecords
> {
  async handle(dto: GetTaskApplicationsDTO): Promise<PaginatedTaskApplicationRecords> {
    const cacheKey = this.generateCacheKey('task:applications', {
      taskId: dto.task_id,
      status: dto.status,
      page: dto.page,
    })

    return await this.executeWithCache(cacheKey, 60, async () => {
      return TaskApplicationRepository.paginateByTask(dto.task_id, {
        status: dto.status,
        page: dto.page,
        perPage: dto.per_page,
      })
    })
  }
}
