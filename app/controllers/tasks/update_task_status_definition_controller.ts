import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateTaskStatusDefinitionCommand from '#actions/tasks/commands/update_task_status_definition_command'
import { UpdateTaskStatusDTO } from '#actions/tasks/dtos/request/task_status_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'

/**
 * PUT /api/task-statuses/:id
 * Update a task status definition for current organization.
 */
export default class UpdateTaskStatusDefinitionController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = new UpdateTaskStatusDTO({
      status_id: params.id as string,
      organization_id: organizationId,
      name: request.input('name') as string | undefined,
      slug: request.input('slug') as string | undefined,
      category: request.input('category') as string | undefined,
      color: request.input('color') as string | undefined,
      icon: request.input('icon') as string | null | undefined,
      description: request.input('description') as string | null | undefined,
      sort_order: request.input('sort_order') as number | undefined,
      is_default: request.input('is_default') as boolean | undefined,
    })

    const command = new UpdateTaskStatusDefinitionCommand(ExecutionContext.fromHttp(ctx))
    const status = await command.execute(dto)

    response.json({ success: true, data: status })
  }
}
