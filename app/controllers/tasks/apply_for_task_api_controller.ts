import type { HttpContext } from '@adonisjs/core/http'
import ApplyForTaskCommand from '#actions/tasks/commands/apply_for_task_command'
import { ApplyForTaskDTO } from '#actions/tasks/dtos/task_application_dtos'
import { HttpStatus } from '#constants/error_constants'

function validateApplicationSource(value: string): 'public_listing' | 'invitation' | 'referral' {
  if (['public_listing', 'invitation', 'referral'].includes(value)) {
    return value as 'public_listing' | 'invitation' | 'referral'
  }
  return 'public_listing'
}

/**
 * POST /api/tasks/:taskId/apply → Apply for a task (JSON API)
 */
export default class ApplyForTaskApiController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx

    try {
      const dto = new ApplyForTaskDTO({
        task_id: String(params.taskId),
        message: request.input('message') as string,
        expected_rate: request.input('expected_rate') as number | undefined,
        portfolio_links: request.input('portfolio_links') as string[] | undefined,
        application_source: validateApplicationSource(
          String(request.input('application_source', 'public_listing'))
        ),
      })

      const command = new ApplyForTaskCommand(ctx)
      const application = await command.handle(dto)

      response.status(HttpStatus.CREATED).json({
        success: true,
        data: application.serialize(),
      })
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit application'
      response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: errorMessage,
      })
      return
    }
  }
}
