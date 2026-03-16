import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateTaskTimeDTO from '#actions/tasks/dtos/request/update_task_time_dto'
import UpdateTaskTimeCommand from '#actions/tasks/commands/update_task_time_command'

/**
 * PATCH /tasks/:id/time
 * Update task time tracking
 */
export default class UpdateTaskTimeController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const dto = new UpdateTaskTimeDTO({
      task_id: params.id as string,
      estimated_time: request.input('estimated_time') as number | undefined,
      actual_time: request.input('actual_time') as number | undefined,
    })

    const command = new UpdateTaskTimeCommand(ExecutionContext.fromHttp(ctx))
    await command.execute(dto)

    session.flash('success', 'Thời gian đã được cập nhật')
    response.redirect().back()
    return
  }
}
