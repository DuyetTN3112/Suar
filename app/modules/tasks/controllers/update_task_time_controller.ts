import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateTaskTimeDTO } from './mappers/request/task_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'

/**
 * PATCH /tasks/:taskId/time
 * Update task time tracking
 */
@inject()
export default class UpdateTaskTimeController {
  constructor(private readonly lifecycleCommands: TaskLifecycleCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const dto = buildUpdateTaskTimeDTO(request, params['taskId'] as string)

    const command = this.lifecycleCommands.makeUpdateTime(actionContextFromHttp(ctx))
    await command.execute(dto)

    session.flash('success', 'Thời gian đã được cập nhật')
    response.redirect().back()
    return
  }
}
