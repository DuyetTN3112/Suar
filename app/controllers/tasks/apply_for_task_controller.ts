import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ApplyForTaskCommand from '#actions/tasks/commands/apply_for_task_command'
import { ApplyForTaskDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * POST /tasks/:taskId/apply → Apply for a task (Inertia)
 */
export default class ApplyForTaskController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const applicationSourceRaw = String(request.input('application_source', 'public_listing'))
    if (!['public_listing', 'invitation', 'referral'].includes(applicationSourceRaw)) {
      throw new BusinessLogicException(`Invalid application source: ${applicationSourceRaw}`)
    }

    const dto = new ApplyForTaskDTO({
      task_id: String(params.taskId),
      message: request.input('message') as string,
      expected_rate: request.input('expected_rate') as number | undefined,
      portfolio_links: request.input('portfolio_links') as string[] | undefined,
      application_source: applicationSourceRaw as 'public_listing' | 'invitation' | 'referral',
    })

    const command = new ApplyForTaskCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Application submitted successfully')
    response.redirect().back()
  }
}
