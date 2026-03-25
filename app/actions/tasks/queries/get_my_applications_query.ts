import { BaseQuery } from '#actions/shared/base_query'
import TaskApplicationRepository from '#infra/tasks/repositories/task_application_repository'
import type TaskApplication from '#models/task_application'
import UnauthorizedException from '#exceptions/unauthorized_exception'

interface MyApplicationsDTO {
  status?: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'all'
  page: number
  per_page: number
}

interface MyApplicationsResult {
  data: TaskApplication[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

/**
 * GetMyApplicationsQuery
 *
 * Fetches applications submitted by the current user.
 * Used by freelancers to track their applications.
 */
export default class GetMyApplicationsQuery extends BaseQuery<
  MyApplicationsDTO,
  MyApplicationsResult
> {
  async handle(dto: MyApplicationsDTO): Promise<MyApplicationsResult> {
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
      const result = await TaskApplicationRepository.paginateByApplicant(userId, {
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
