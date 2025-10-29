import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateTaskStatusDTO } from '../mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from '../mappers/response/task_status_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import CreateTaskStatusCommand from '#modules/tasks/actions/commands/create_task_status_command'

export default class CreateTaskStatusController {
  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildCreateTaskStatusDTO(ctx.request, organizationId)
    const status = await new CreateTaskStatusCommand(actionContextFromHttp(ctx)).execute(dto)

    ctx.response.status(201)
    return mapTaskStatusMutationApiBody(status)
  }
}
