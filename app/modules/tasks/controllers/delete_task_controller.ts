import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteTaskDTO } from './mappers/request/task_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'

/**
 * DELETE /tasks/:taskId
 * Delete task (soft delete)
 */
@inject()
export default class DeleteTaskController {
  constructor(private readonly lifecycleCommands: TaskLifecycleCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { params, response, session, request } = ctx
    const dto = buildDeleteTaskDTO(request, params['taskId'] as string)
    const command = this.lifecycleCommands.makeDelete(actionContextFromHttp(ctx))
    await command.execute(dto)

    session.flash('success', 'Nhiệm vụ đã được xóa thành công')

    if (request.header('X-Inertia')) {
      response.noContent()
      return
    }

    response.redirect().toRoute('tasks.index')
    return
  }
}
