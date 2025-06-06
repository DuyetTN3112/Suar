import type { HttpContext } from '@adonisjs/core/http'
import ApplyForTaskCommand from '#actions/tasks/commands/apply_for_task_command'
import { ApplyForTaskDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { HttpStatus } from '#constants/error_constants'

/**
 * POST /api/tasks/:taskId/apply → Apply for a task (JSON API)
 */
export default class ApplyForTaskApiController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx

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

    const command = new ApplyForTaskCommand(ctx)
    const application = await command.handle(dto)

    response.status(HttpStatus.CREATED).json({
      success: true,
      data: application.serialize(),
    })
    return
  }
}
