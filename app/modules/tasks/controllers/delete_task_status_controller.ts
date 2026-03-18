import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteTaskStatusDTO } from './mappers/request/task_status_request_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskStatusDefinitionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_definition_command_factory'

/**
 * DELETE /api/task-statuses/:taskStatusId
 * Soft-delete a task status definition.
 */
@inject()
export default class DeleteTaskStatusController {
  constructor(private readonly statusCommands: TaskStatusDefinitionCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { response, params } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildDeleteTaskStatusDTO(organizationId, params['taskStatusId'] as string)

    const command = this.statusCommands.makeDelete(actionContextFromHttp(ctx))
    await command.execute(dto)

    response.noContent()
  }
}
