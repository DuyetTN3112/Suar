import type { HttpContext } from '@adonisjs/core/http'


import { buildDeleteTaskStatusDTO } from './mappers/request/task_status_request_mapper.js'
import { mapTaskStatusDeleteApiBody } from './mappers/response/task_status_response_mapper.js'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeDeleteTaskStatusCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * DELETE /api/task-statuses/:id
 * Soft-delete a task status definition.
 */
export default class DeleteTaskStatusController {
  async handle(ctx: HttpContext) {
    const { response, params, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildDeleteTaskStatusDTO(organizationId, params.id as string)

    const command = makeDeleteTaskStatusCommand(actionContextFromHttp(ctx))
    await command.execute(dto)

    response.json(mapTaskStatusDeleteApiBody())
  }
}
