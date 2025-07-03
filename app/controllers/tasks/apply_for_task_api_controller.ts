import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ApplyForTaskCommand from '#actions/tasks/commands/apply_for_task_command'
import { HttpStatus } from '#constants/error_constants'
import { buildApplyForTaskDTO } from './mapper/request/task_application_request_mapper.js'
import { mapApplyForTaskApiBody } from './mapper/response/task_application_response_mapper.js'

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
