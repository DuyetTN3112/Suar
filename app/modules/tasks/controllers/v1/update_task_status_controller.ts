import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateTaskStatusDefinitionDTO } from '../mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from '../mappers/response/task_status_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import UpdateTaskStatusDefinitionCommand from '#modules/tasks/actions/commands/update_task_status_definition_command'

export default class UpdateTaskStatusController {
  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildUpdateTaskStatusDefinitionDTO(
      ctx.request,
      organizationId,
      ctx.params['taskStatusId'] as string
    )
    const status = await new UpdateTaskStatusDefinitionCommand(actionContextFromHttp(ctx)).execute(
      dto
    )

    return mapTaskStatusMutationApiBody(status)
  }
}
