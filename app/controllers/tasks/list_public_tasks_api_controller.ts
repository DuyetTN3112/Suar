import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetPublicTasksQuery from '#actions/tasks/queries/get_public_tasks_query'
import { GetPublicTasksDTO } from '#actions/tasks/dtos/request/task_application_dtos'

/**
 * GET /api/marketplace/tasks → Browse public tasks (JSON API)
 */
export default class ListPublicTasksApiController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx

    const dto = new GetPublicTasksDTO({
      page: request.input('page', 1) as number,
      per_page: request.input('per_page', 20) as number,
      skill_ids: request.input('skill_ids') as string[] | null | undefined,
      keyword: request.input('keyword') as string | null | undefined,
      difficulty: request.input('difficulty') as string | null | undefined,
      min_budget: request.input('min_budget') as number | null | undefined,
      max_budget: request.input('max_budget') as number | null | undefined,
      sort_by: request.input('sort_by', 'created_at') as 'created_at' | 'budget' | 'due_date',
      sort_order: request.input('sort_order', 'desc') as 'asc' | 'desc',
    })

    const query = new GetPublicTasksQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(dto)

    const serializedTasks = result.data.map((task) => {
      if (typeof (task as { serialize?: () => unknown }).serialize === 'function') {
        return (task as { serialize: () => unknown }).serialize()
      }
      return task
    })

    response.json({
      data: serializedTasks,
      meta: result.meta,
    })
  }
}
