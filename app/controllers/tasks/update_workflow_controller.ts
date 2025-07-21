import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateWorkflowDTO } from './mappers/request/task_status_request_mapper.js'
import { mapWorkflowUpdateApiBody } from './mappers/response/task_status_response_mapper.js'

import UpdateWorkflowCommand from '#actions/tasks/commands/update_workflow_command'
import { ErrorMessages } from '#constants/error_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ExecutionContext } from '#types/execution_context'

/**
 * PUT /api/workflow
 * Replace the entire workflow (transitions) for current organization.
 */
export default class UpdateWorkflowController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildUpdateWorkflowDTO(request, organizationId)

    const command = new UpdateWorkflowCommand(ExecutionContext.fromHttp(ctx))
    const transitions = await command.execute(dto)

    response.json(mapWorkflowUpdateApiBody(transitions))
  }
}
