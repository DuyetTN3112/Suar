import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateTaskStatusDTO } from '../mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from '../mappers/response/task_status_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskStatusDefinitionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_definition_command_factory'

/**
 * POST /api/task-statuses
 * Create a new task status for current organization.
 */
@inject()
export default class CreateTaskStatusController {
  constructor(private readonly statusCommands: TaskStatusDefinitionCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildCreateTaskStatusDTO(request, organizationId)

    const command = this.statusCommands.makeCreate(actionContextFromHttp(ctx))
    const status = await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    response.status(201)
    return mapTaskStatusMutationApiBody(status)
  }
}
