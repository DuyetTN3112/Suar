import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateWorkflowDTO } from '../mappers/request/task_status_request_mapper.js'
import { mapWorkflowUpdateApiBody } from '../mappers/response/task_status_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskStatusWorkflowCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_workflow_command_factory'

@inject()
export default class ReplaceTaskWorkflowTransitionsV1Controller {
  constructor(private readonly commands: TaskStatusWorkflowCommandFactory) {}

  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildUpdateWorkflowDTO(ctx.request, organizationId)
    const transitions = await this.commands
      .makeReplaceWorkflow(actionContextFromHttp(ctx))
      .execute(dto)

    return mapWorkflowUpdateApiBody(transitions)
  }
}
