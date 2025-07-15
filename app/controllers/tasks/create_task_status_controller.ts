import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateTaskStatusDTO } from './mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from './mappers/response/task_status_response_mapper.js'

import CreateTaskStatusCommand from '#actions/tasks/commands/create_task_status_command'
import { ErrorMessages } from '#constants/error_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ExecutionContext } from '#types/execution_context'

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

    const dto = buildCreateTaskStatusDTO(request, organizationId)

    const command = new CreateTaskStatusCommand(ExecutionContext.fromHttp(ctx))
    const status = await command.execute(dto)

    response.status(201).json(mapTaskStatusMutationApiBody(status))
  }
}
