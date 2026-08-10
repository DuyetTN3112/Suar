import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateTaskStatusDefinitionDTO } from '../mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from '../mappers/response/task_status_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskStatusDefinitionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_definition_command_factory'

/**
 * PUT|PATCH /api/task-statuses/:taskStatusId
 * Update a task status definition for current organization.
 */
@inject()
export default class UpdateTaskStatusDefinitionController {
  constructor(private readonly statusCommands: TaskStatusDefinitionCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildUpdateTaskStatusDefinitionDTO(
      request,
      organizationId,
      params['taskStatusId'] as string
    )

    const command = this.statusCommands.makeUpdate(actionContextFromHttp(ctx))
    const status = await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    return mapTaskStatusMutationApiBody(status)
  }
}
