import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateWorkflowDTO } from './mappers/request/task_status_request_mapper.js'
import { mapWorkflowUpdateApiBody } from './mappers/response/task_status_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import ReplaceTaskWorkflowTransitionsCommand from '#modules/tasks/actions/commands/replace_task_workflow_transitions_command'

/**
 * PUT /api/workflow
 * Replace the entire workflow (transitions) for current organization.
 */
export default class ReplaceTaskWorkflowTransitionsController {
  async handle(ctx: HttpContext) {
    const { request } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildUpdateWorkflowDTO(request, organizationId)

    const command = new ReplaceTaskWorkflowTransitionsCommand(actionContextFromHttp(ctx))
    const transitions = await command.execute(dto)

    return mapWorkflowUpdateApiBody(transitions)
  }
}
