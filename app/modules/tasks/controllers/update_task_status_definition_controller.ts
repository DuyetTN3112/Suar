import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateTaskStatusDefinitionDTO } from './mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from './mappers/response/task_status_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import UpdateTaskStatusDefinitionCommand from '#modules/tasks/actions/commands/update_task_status_definition_command'

/**
 * PUT|PATCH /api/task-statuses/:taskStatusId
 * Update a task status definition for current organization.
 */
export default class UpdateTaskStatusDefinitionController {
  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildUpdateTaskStatusDefinitionDTO(
      request,
      organizationId,
      params['taskStatusId'] as string
    )

    const command = new UpdateTaskStatusDefinitionCommand(actionContextFromHttp(ctx))
    const status = await command.execute(dto)

    return mapTaskStatusMutationApiBody(status)
  }
}
