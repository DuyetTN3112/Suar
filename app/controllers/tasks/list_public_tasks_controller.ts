import type { HttpContext } from '@adonisjs/core/http'
import GetPublicTasksQuery from '#actions/tasks/queries/get_public_tasks_query'
import { GetPublicTasksDTO } from '#actions/tasks/dtos/request/task_application_dtos'

/**
 * GET /marketplace/tasks → Browse public tasks (Inertia page)
 */
export default class ListPublicTasksController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const dto = new GetPublicTasksDTO({
      page: request.input('page', 1) as number,
      per_page: request.input('per_page', 20) as number,
      skill_ids: request.input('skill_ids') as string[] | null | undefined,
      difficulty: request.input('difficulty') as string | null | undefined,
      min_budget: request.input('min_budget') as number | null | undefined,
      max_budget: request.input('max_budget') as number | null | undefined,
      sort_by: request.input('sort_by', 'created_at') as 'created_at' | 'budget' | 'due_date',
      sort_order: request.input('sort_order', 'desc') as 'asc' | 'desc',
    })

    const query = new GetPublicTasksQuery(ctx)
    const result = await query.handle(dto)

    return inertia.render('marketplace/tasks', {
      tasks: result.data.map((t) => t.serialize()),
      meta: result.meta,
      filters: {
        skill_ids: dto.skill_ids,
        difficulty: dto.difficulty,
        min_budget: dto.min_budget,
        max_budget: dto.max_budget,
        sort_by: dto.sort_by,
        sort_order: dto.sort_order,
      },
    })
  }
}
