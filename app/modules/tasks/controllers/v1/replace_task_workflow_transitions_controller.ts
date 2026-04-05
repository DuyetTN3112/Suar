import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateWorkflowDTO } from '../mappers/request/task_status_request_mapper.js'
import { mapWorkflowUpdateApiBody } from '../mappers/response/task_status_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import ReplaceTaskWorkflowTransitionsCommand from '#modules/tasks/actions/commands/replace_task_workflow_transitions_command'

export default class ReplaceTaskWorkflowTransitionsV1Controller {
  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildUpdateWorkflowDTO(ctx.request, organizationId)
    const transitions = await new ReplaceTaskWorkflowTransitionsCommand(
      actionContextFromHttp(ctx)
    ).execute(dto)

    return mapWorkflowUpdateApiBody(transitions)
  }
}
