import { BaseQuery } from '#actions/tasks/base_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import TaskApplicationRepository from '#infra/tasks/repositories/task_application_repository'
import type { PaginatedTaskApplicationRecords } from '#types/task_records'

export interface GetMyApplicationsInput {
  status?: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'all'
  page: number
  per_page: number
}

/**
 * GetMyApplicationsQuery
 *
 * Fetches applications submitted by the current user.
 * Used by freelancers to track their applications.
 */
export default class GetMyApplicationsQuery extends BaseQuery<
  GetMyApplicationsInput,
  PaginatedTaskApplicationRecords
> {
  async handle(dto: GetMyApplicationsInput): Promise<PaginatedTaskApplicationRecords> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    const cacheKey = this.generateCacheKey('user:applications', {
      userId,
      status: dto.status,
      page: dto.page,
    })

    return await this.executeWithCache(cacheKey, 60, async () => {
      return TaskApplicationRepository.paginateByApplicant(userId, {
        status: dto.status,
        page: dto.page,
        perPage: dto.per_page,
      })
    })
  }
}
