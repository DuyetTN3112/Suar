import type { HttpContext } from '@adonisjs/core/http'


import { buildApplyForTaskDTO } from './mappers/request/task_application_request_mapper.js'
import { mapApplyForTaskApiBody } from './mappers/response/task_application_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeApplyForTaskCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * POST /api/tasks/:taskId/apply → Apply for a task (JSON API)
 */
export default class ApplyForTaskApiController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx
    const dto = await buildApplyForTaskDTO(request, String(params.taskId))

    const command = makeApplyForTaskCommand(actionContextFromHttp(ctx))
    const application = await command.handle(dto)

    response.status(HttpStatus.CREATED).json(mapApplyForTaskApiBody(application))
    return
  }
}
