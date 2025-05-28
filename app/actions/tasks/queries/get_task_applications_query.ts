import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import TaskApplication from '#models/task_application'
import { GetTaskApplicationsDTO } from '#actions/tasks/dtos/task_application_dtos'

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
      const query = TaskApplication.query()
        .where('task_id', dto.task_id)
        .preload('applicant', (userQuery) => {
          userQuery.preload('detail').preload('skills', (skillsQuery) => {
            skillsQuery.preload('skill').preload('proficiency_level')
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
