import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateTaskStatusCommand from '#actions/tasks/commands/update_task_status_command'
import { HttpStatus } from '#constants/error_constants'
import { buildUpdateTaskStatusDTO } from './mapper/request/task_request_mapper.js'
import { mapTaskStatusApiBody } from './mapper/response/task_response_mapper.js'

/**
 * PATCH /tasks/:id/status
 * Update task status
 */
export default class UpdateTaskStatusController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const dto = buildUpdateTaskStatusDTO(request, params.id as string)
    const task = await new UpdateTaskStatusCommand(ExecutionContext.fromHttp(ctx)).execute(dto)

    response
      .status(HttpStatus.OK)
      .json(mapTaskStatusApiBody(task, 'Trạng thái nhiệm vụ đã được cập nhật'))
  }
}
