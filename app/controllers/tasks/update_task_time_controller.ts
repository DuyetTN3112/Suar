import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateTaskTimeCommand from '#actions/tasks/commands/update_task_time_command'
import { buildUpdateTaskTimeDTO } from './mapper/request/task_request_mapper.js'

/**
 * PATCH /tasks/:id/time
 * Update task time tracking
 */
export default class UpdateTaskTimeController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const dto = buildUpdateTaskTimeDTO(request, params.id as string)

    const command = new UpdateTaskTimeCommand(ExecutionContext.fromHttp(ctx))
    await command.execute(dto)

    session.flash('success', 'Thời gian đã được cập nhật')
    response.redirect().back()
    return
  }
}
