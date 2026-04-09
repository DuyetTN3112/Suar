import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import DeleteTaskCommand from '#actions/tasks/commands/delete_task_command'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { HttpStatus } from '#constants/error_constants'
import { buildDeleteTaskDTO } from './mapper/request/task_request_mapper.js'

/**
 * DELETE /tasks/:id
 * Delete task (soft delete)
 */
export default class DeleteTaskController {
  async handle(ctx: HttpContext) {
    const { params, response, session, request } = ctx
    const dto = buildDeleteTaskDTO(request, params.id as string)
    const command = new DeleteTaskCommand(ExecutionContext.fromHttp(ctx))
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
