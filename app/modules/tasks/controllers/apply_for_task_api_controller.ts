import type { HttpContext } from '@adonisjs/core/http'

import { buildApplyForTaskDTO } from './mappers/request/task_application_request_mapper.js'
import { mapApplyForTaskApiBody } from './mappers/response/task_application_response_mapper.js'

import ApplyForTaskCommand from '#actions/tasks/commands/apply_for_task_command'
import { HttpStatus } from '#modules/errors/constants/error_constants'
import { ExecutionContext } from '#types/execution_context'

/**
 * POST /api/tasks/:taskId/apply → Apply for a task (JSON API)
 */
export default class ApplyForTaskApiController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx
    const dto = await buildApplyForTaskDTO(request, String(params.taskId))

    const command = new ApplyForTaskCommand(ExecutionContext.fromHttp(ctx))
    const application = await command.handle(dto)

    response.status(HttpStatus.CREATED).json(mapApplyForTaskApiBody(application))
    return
  }
}
