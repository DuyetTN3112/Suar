import type { HttpContext } from '@adonisjs/core/http'

import { buildApplyForTaskDTO } from './mappers/request/task_application_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeApplyForTaskCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * POST /tasks/:taskId/apply → Apply for a task (Inertia)
 */
export default class ApplyForTaskController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx
    const dto = await buildApplyForTaskDTO(request, String(params.taskId))

    const command = makeApplyForTaskCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Application submitted successfully')
    response.redirect().back()
  }
}
