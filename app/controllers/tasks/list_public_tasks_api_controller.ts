import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetPublicTasksQuery from '#actions/tasks/queries/get_public_tasks_query'
import { buildGetPublicTasksDTO } from './mappers/request/task_application_request_mapper.js'
import { mapPublicTasksApiBody } from './mappers/response/public_task_response_mapper.js'

/**
 * GET /api/marketplace/tasks → Browse public tasks (JSON API)
 */
export default class ListPublicTasksApiController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx

    const dto = buildGetPublicTasksDTO(request)

    const query = new GetPublicTasksQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(dto)

    response.json(mapPublicTasksApiBody(result))
  }
}
