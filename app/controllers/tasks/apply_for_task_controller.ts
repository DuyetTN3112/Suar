import type { HttpContext } from '@adonisjs/core/http'

import { buildApplyForTaskDTO } from './mappers/request/task_application_request_mapper.js'

import ApplyForTaskCommand from '#actions/tasks/commands/apply_for_task_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * POST /tasks/:taskId/apply → Apply for a task (Inertia)
 */
export default class ApplyForTaskController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx
    const dto = await buildApplyForTaskDTO(request, String(params.taskId))

    const command = new ApplyForTaskCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Application submitted successfully')
    response.redirect().back()
  }
}
