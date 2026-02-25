import type { HttpContext } from '@adonisjs/core/http'

import { buildGetTaskDetailDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskDetailApiBody } from './mappers/response/task_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { makeGetTaskDetailQuery } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * GET /api/tasks/:taskId
 * Return full task detail as JSON for task detail modal hydration.
 */
export default class ShowTaskApiController {
  async handle(ctx: HttpContext) {
    const getTaskDetailQuery = makeGetTaskDetailQuery(actionContextFromHttp(ctx))
    const result = await getTaskDetailQuery.execute(
      buildGetTaskDetailDTO(ctx.params['taskId'] as string)
    )

    return mapTaskDetailApiBody(result.task)
  }
}
