import type { HttpContext } from '@adonisjs/core/http'

import { buildGetPublicTasksDTO } from './mappers/request/task_application_request_mapper.js'
import { mapPublicTasksPageProps } from './mappers/response/public_task_response_mapper.js'

import GetPublicTasksQuery from '#actions/tasks/queries/get_public_tasks_query'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /marketplace/tasks → Browse public tasks (Inertia page)
 */
export default class ListPublicTasksController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const dto = buildGetPublicTasksDTO(request)

    const query = new GetPublicTasksQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(dto)

    return inertia.render('marketplace/tasks', mapPublicTasksPageProps(result, dto))
  }
}
