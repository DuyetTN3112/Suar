import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteTaskDTO } from './mappers/request/task_request_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeDeleteTaskCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * DELETE /tasks/:id
 * Delete task (soft delete)
 */
export default class DeleteTaskController {
  async handle(ctx: HttpContext) {
    const { params, response, session, request } = ctx
    const dto = buildDeleteTaskDTO(request, params.id as string)
    const command = makeDeleteTaskCommand(actionContextFromHttp(ctx))
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
