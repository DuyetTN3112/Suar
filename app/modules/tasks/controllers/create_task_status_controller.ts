import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateTaskStatusDTO } from './mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from './mappers/response/task_status_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import CreateTaskStatusCommand from '#modules/tasks/actions/commands/create_task_status_command'

/**
 * POST /api/task-statuses
 * Create a new task status for current organization.
 */
export default class CreateTaskStatusController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildCreateTaskStatusDTO(request, organizationId)

    const command = new CreateTaskStatusCommand(actionContextFromHttp(ctx))
    const status = await command.execute(dto)

    response.status(201)
    return mapTaskStatusMutationApiBody(status)
  }
}
