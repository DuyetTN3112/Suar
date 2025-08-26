import type { HttpContext } from '@adonisjs/core/http'


import { buildGetPublicTasksDTO } from './mappers/request/task_application_request_mapper.js'
import { mapPublicTasksApiBody } from './mappers/response/public_task_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetPublicTasksQuery from '#modules/tasks/actions/queries/get_public_tasks_query'

/**
 * GET /api/marketplace/tasks → Browse public tasks (JSON API)
 */
export default class ListPublicTasksApiController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx

    const dto = buildGetPublicTasksDTO(request)

    const query = new GetPublicTasksQuery(actionContextFromHttp(ctx))
    const result = await query.handle(dto)

    response.json(mapPublicTasksApiBody(result))
  }
}
