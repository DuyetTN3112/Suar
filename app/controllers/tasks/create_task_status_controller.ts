import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import CreateTaskStatusCommand from '#actions/tasks/commands/create_task_status_command'
import { CreateTaskStatusDTO } from '#actions/tasks/dtos/request/task_status_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'

/**
 * POST /api/task-statuses
 * Create a new task status for current organization.
 */
export default class CreateTaskStatusController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = new CreateTaskStatusDTO({
      organization_id: organizationId,
      name: request.input('name') as string,
      slug: request.input('slug') as string,
      category: request.input('category') as string,
      color: request.input('color') as string | undefined,
      icon: request.input('icon') as string | undefined,
      description: request.input('description') as string | undefined,
      sort_order: request.input('sort_order') as number | undefined,
    })

    const command = new CreateTaskStatusCommand(ExecutionContext.fromHttp(ctx))
    const status = await command.execute(dto)

    response.status(201).json({ success: true, data: status })
  }
}
