import type { HttpContext } from '@adonisjs/core/http'


import { buildUpdateTaskStatusDefinitionDTO } from './mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from './mappers/response/task_status_response_mapper.js'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UpdateTaskStatusDefinitionCommand from '#modules/tasks/actions/commands/update_task_status_definition_command'

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

    const command = new UpdateTaskStatusDefinitionCommand(actionContextFromHttp(ctx))
    const status = await command.execute(dto)

    response.json(mapTaskStatusMutationApiBody(status))
  }
}
