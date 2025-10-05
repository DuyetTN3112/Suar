import type { HttpContext } from '@adonisjs/core/http'


import { buildUpdateTaskStatusDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskStatusApiBody } from './mappers/response/task_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { makeUpdateTaskStatusCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * PATCH /tasks/:taskId/status
 * Update task status
 */
export default class UpdateTaskStatusController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const dto = buildUpdateTaskStatusDTO(request, params['taskId'] as string)
    const task = await makeUpdateTaskStatusCommand(actionContextFromHttp(ctx)).execute(dto)

    response
      .status(HttpStatus.OK)
      .json(mapTaskStatusApiBody(task))
  }
}
