import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import DeleteTaskDTO from '#actions/tasks/dtos/request/delete_task_dto'
import DeleteTaskCommand from '#actions/tasks/commands/delete_task_command'
import CreateNotification from '#actions/common/create_notification'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { HttpStatus } from '#constants/error_constants'

/**
 * DELETE /tasks/:id
 * Delete task (soft delete)
 */
export default class DeleteTaskController {
  async handle(ctx: HttpContext) {
    const { params, response, session, request } = ctx
    const dto = new DeleteTaskDTO({
      task_id: params.id as string,
      reason: request.input('reason') as string | undefined,
      permanent: request.input('permanent', false) as boolean,
    })

    const command = new DeleteTaskCommand(ExecutionContext.fromHttp(ctx), new CreateNotification())
    const result = await command.execute(dto)

    if (!result.success) {
      throw new BusinessLogicException(result.message)
    }

    session.flash('success', 'Nhiệm vụ đã được xóa thành công')

    if (request.header('X-Inertia')) {
      response.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
      })
      return
    }

    response.redirect().toRoute('tasks.index')
    return
  }
}
