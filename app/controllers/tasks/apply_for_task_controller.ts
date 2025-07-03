import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ApplyForTaskCommand from '#actions/tasks/commands/apply_for_task_command'
import { buildApplyForTaskDTO } from './mapper/request/task_application_request_mapper.js'

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
