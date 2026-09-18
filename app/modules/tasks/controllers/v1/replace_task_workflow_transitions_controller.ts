import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateWorkflowDTO } from '../mappers/request/task-status/task_status_request_mapper.js'
import { mapWorkflowUpdateApiBody } from '../mappers/response/task-status/task_status_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskStatusWorkflowCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_workflow_command_factory'

/**
 * PUT /api/workflow
 * Replace the entire workflow (transitions) for current organization.
 */
@inject()
export default class ReplaceTaskWorkflowTransitionsController {
  constructor(private readonly commands: TaskStatusWorkflowCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildUpdateWorkflowDTO(request, organizationId)

    const command = this.commands.makeReplaceWorkflow(actionContextFromHttp(ctx))
    const transitions = await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    return mapWorkflowUpdateApiBody(transitions)
  }
}
