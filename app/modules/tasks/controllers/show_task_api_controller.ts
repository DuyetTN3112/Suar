import type { HttpContext } from '@adonisjs/core/http'

import { buildGetTaskDetailDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskDetailApiBody } from './mappers/response/task_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeGetTaskDetailQuery } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * GET /api/tasks/:id
 * Return full task detail as JSON for task detail modal hydration.
 */
export default class ShowTaskApiController {
  async handle(ctx: HttpContext) {
    const getTaskDetailQuery = makeGetTaskDetailQuery(actionContextFromHttp(ctx))
    const result = await getTaskDetailQuery.execute(buildGetTaskDetailDTO(ctx.params.id as string))

    ctx.response.json(mapTaskDetailApiBody(result.task))
  }
}
