import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import DeleteTaskDTO from '#actions/tasks/dtos/delete_task_dto'
import DeleteTaskCommand from '#actions/tasks/commands/delete_task_command'
import CreateNotification from '#actions/common/create_notification'

/**
 * DELETE /tasks/:id
 * Delete task (soft delete)
 */
export default class DeleteTaskController {
  async handle(ctx: HttpContext) {
    try {
      const { params, response, session, request } = ctx
      const dto = new DeleteTaskDTO({
        task_id: params.id as string,
        reason: request.input('reason') as string | undefined,
        permanent: request.input('permanent', false) as boolean,
      })

      const command = new DeleteTaskCommand(
        ExecutionContext.fromHttp(ctx),
        new CreateNotification()
      )
      const result = await command.execute(dto)

      if (!result.success) {
        session.flash('error', result.message)
        if (request.header('X-Inertia')) {
          response.status(400).json({
            success: false,
            message: result.message,
          })
          return
        }
        response.redirect().back()
        return
      }

      session.flash('success', 'Nhiệm vụ đã được xóa thành công')

      if (request.header('X-Inertia')) {
        response.status(200).json({
          success: true,
          message: result.message,
        })
        return
      }

      response.redirect().toRoute('tasks.index')
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi xóa nhiệm vụ'
      ctx.session.flash('error', errorMessage)
      if (ctx.request.header('X-Inertia')) {
        ctx.response.status(500).json({
          success: false,
          message: errorMessage,
        })
        return
      }
      ctx.response.redirect().back()
      return
    }
  }
}
