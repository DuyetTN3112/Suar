import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteTaskDTO } from './mappers/request/task_request_mapper.js'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { makeDeleteTaskCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * DELETE /tasks/:taskId
 * Delete task (soft delete)
 */
export default class DeleteTaskController {
  async handle(ctx: HttpContext) {
    const { params, response, session, request } = ctx
    const dto = buildDeleteTaskDTO(request, params['taskId'] as string)
    const command = makeDeleteTaskCommand(actionContextFromHttp(ctx))
    const result = await command.execute(dto)

    if (!result.success) {
      throw new BusinessLogicException(result.message)
    }

    session.flash('success', 'Nhiệm vụ đã được xóa thành công')

    if (request.header('X-Inertia')) {
      response.noContent()
      return
    }

    response.redirect().toRoute('tasks.index')
    return
  }
}
