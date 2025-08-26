import type { HttpContext } from '@adonisjs/core/http'


import { buildUpdateTaskStatusDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskStatusApiBody } from './mappers/response/task_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeUpdateTaskStatusCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * PATCH /tasks/:id/status
 * Update task status
 */
export default class UpdateTaskStatusController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const dto = buildUpdateTaskStatusDTO(request, params.id as string)
    const task = await makeUpdateTaskStatusCommand(actionContextFromHttp(ctx)).execute(dto)

    response
      .status(HttpStatus.OK)
      .json(mapTaskStatusApiBody(task, 'Trạng thái nhiệm vụ đã được cập nhật'))
  }
}
