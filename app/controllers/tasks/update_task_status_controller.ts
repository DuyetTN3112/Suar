import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateTaskStatusDTO from '#actions/tasks/dtos/update_task_status_dto'
import UpdateTaskStatusCommand from '#actions/tasks/commands/update_task_status_command'
import CreateNotification from '#actions/common/create_notification'

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
        status: request.input('status') as string,
        reason: request.input('reason') as string | undefined,
      })

      const command = new UpdateTaskStatusCommand(
        ExecutionContext.fromHttp(ctx),
        new CreateNotification()
      )
      const task = await command.execute(dto)

      response.status(200).json({
        success: true,
        message: 'Trạng thái nhiệm vụ đã được cập nhật',
        task,
      })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật trạng thái nhiệm vụ'
      ctx.response.status(500).json({
        success: false,
        message: errorMessage,
      })
      return
    }
  }
}
