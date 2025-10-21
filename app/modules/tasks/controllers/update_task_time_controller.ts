import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateTaskTimeDTO } from './mappers/request/task_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { makeUpdateTaskTimeCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * PATCH /tasks/:taskId/time
 * Update task time tracking
 */
export default class UpdateTaskTimeController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const dto = buildUpdateTaskTimeDTO(request, params['taskId'] as string)

    const command = makeUpdateTaskTimeCommand(actionContextFromHttp(ctx))
    await command.execute(dto)

    session.flash('success', 'Thời gian đã được cập nhật')
    response.redirect().back()
    return
  }
}
