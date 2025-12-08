import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import TaskApplication from '#models/task_application'

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
export default class GetMyApplicationsQuery extends BaseQuery<MyApplicationsDTO, MyApplicationsResult> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: MyApplicationsDTO): Promise<MyApplicationsResult> {
    const userId = this.getCurrentUser()!.id

    const cacheKey = this.generateCacheKey('user:applications', {
      userId,
      status: dto.status,
      page: dto.page,
    })

    return await this.executeWithCache(cacheKey, 60, async () => {
      const query = TaskApplication.query()
        .where('applicant_id', userId)
        .preload('task', (taskQuery) => {
          taskQuery
            .preload('status')
            .preload('priority')
            .preload('difficulty_level')
            .preload('organization', (orgQuery) => {
              orgQuery.select(['id', 'name', 'logo_url'])
            })
        })
        .orderBy('applied_at', 'desc')

      // Filter by status
      if (dto.status && dto.status !== 'all') {
        query.where('application_status', dto.status)
      }

      const result = await query.paginate(dto.page, dto.per_page)

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
