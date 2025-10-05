import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskWorkflowApiBody } from './mappers/response/task_status_response_mapper.js'

import { requireCurrentOrganizationId } from '#modules/http/public_contracts/http_execution_context'
import ListWorkflowQuery from '#modules/tasks/actions/queries/list_workflow_query'

/**
 * GET /api/workflow
 * List all workflow transitions for current organization.
 */
export default class ListWorkflowController {
  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const query = new ListWorkflowQuery()
    const transitions = await query.execute(organizationId)

    return mapTaskWorkflowApiBody(transitions)
  }
}
