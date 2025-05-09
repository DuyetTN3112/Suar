import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import Task from '#models/task'
import type { GetPublicTasksDTO } from '#actions/tasks/dtos/task_application_dtos'

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
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: GetPublicTasksDTO): Promise<PublicTaskListResult> {
    const cacheKey = this.generateCacheKey('tasks:public', {
      page: dto.page,
      perPage: dto.per_page,
      skillIds: dto.skill_ids?.join(','),
      difficultyLevelId: dto.difficulty_level_id,
      minBudget: dto.min_budget,
      maxBudget: dto.max_budget,
      sortBy: dto.sort_by,
      sortOrder: dto.sort_order,
    })

    return await this.executeWithCache(cacheKey, 120, async () => {
      const userId = this.getCurrentUser()?.id

      const query = Task.query()
        .where('is_public_listing', true)
        .whereNull('deleted_at')
        .whereNull('assigned_to') // Only unassigned tasks
        .preload('status')
        .preload('priority')
        .preload('difficulty_level')
        .preload('organization', (orgQuery) => {
          void orgQuery.select(['id', 'name', 'logo_url'])
        })
        .preload('required_skills_rel', (skillsQuery) => {
          void skillsQuery.preload('skill')
          void skillsQuery.preload('required_level')
        })

      // Filter by difficulty
      if (dto.difficulty_level_id) {
        void query.where('difficulty_level_id', dto.difficulty_level_id)
      }

      // Filter by budget
      if (dto.min_budget) {
        void query.where('estimated_budget', '>=', dto.min_budget)
      }
      if (dto.max_budget) {
        void query.where('estimated_budget', '<=', dto.max_budget)
      }

      // Filter by required skills
      if (dto.skill_ids && dto.skill_ids.length > 0) {
        void query.whereHas('required_skills_rel', (builder) => {
          void builder.whereIn('skill_id', dto.skill_ids ?? [])
        })
      }

      // Sorting
      switch (dto.sort_by) {
        case 'budget':
          void query.orderBy('estimated_budget', dto.sort_order)
          break
        case 'due_date':
          void query.orderBy('due_date', dto.sort_order)
          break
        default:
          void query.orderBy('created_at', dto.sort_order)
      }

      // Add user's application status if logged in
      if (userId) {
        void query.withCount('applications', (appQuery) => {
          void appQuery.where('applicant_id', userId).as('user_applied')
        })
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
