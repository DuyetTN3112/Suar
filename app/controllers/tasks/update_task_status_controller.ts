import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateTaskStatusDTO from '#actions/tasks/dtos/request/update_task_status_dto'
import UpdateTaskStatusCommand from '#actions/tasks/commands/update_task_status_command'
import CreateNotification from '#actions/common/create_notification'
import { HttpStatus } from '#constants/error_constants'

/**
 * PATCH /tasks/:id/status
 * Update task status
 */
export default class UpdateTaskStatusController {
  async handle(ctx: HttpContext) {
    try {
      const { params, request, response } = ctx
      const dto = new UpdateTaskStatusDTO({
        task_id: params.id as string,
        task_status_id: request.input('task_status_id') as string,
        reason: request.input('reason') as string | undefined,
      })

      const command = new UpdateTaskStatusCommand(
        ExecutionContext.fromHttp(ctx),
        new CreateNotification()
      )
      const task = await command.execute(dto)

      response.status(HttpStatus.OK).json({
        success: true,
        message: 'Trạng thái nhiệm vụ đã được cập nhật',
        task,
      })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật trạng thái nhiệm vụ'
      ctx.response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: errorMessage,
      })
      return
    }
  }
}
