import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateTaskStatusDefinitionDTO } from '../mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from '../mappers/response/task_status_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskStatusDefinitionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_definition_command_factory'

@inject()
export default class UpdateTaskStatusController {
  constructor(private readonly statusCommands: TaskStatusDefinitionCommandFactory) {}

  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildUpdateTaskStatusDefinitionDTO(
      ctx.request,
      organizationId,
      ctx.params['taskStatusId'] as string
    )
    const status = await this.statusCommands
      .makeUpdate(actionContextFromHttp(ctx))
      .execute(dto)

    return mapTaskStatusMutationApiBody(status)
  }
}
