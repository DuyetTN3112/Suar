import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateTaskStatusDefinitionCommand from '#actions/tasks/commands/update_task_status_definition_command'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { buildUpdateTaskStatusDefinitionDTO } from './mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from './mappers/response/task_status_response_mapper.js'

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

    const dto = buildUpdateTaskStatusDefinitionDTO(request, organizationId, params.id as string)

    const command = new UpdateTaskStatusDefinitionCommand(ExecutionContext.fromHttp(ctx))
    const status = await command.execute(dto)

    response.json(mapTaskStatusMutationApiBody(status))
  }
}
