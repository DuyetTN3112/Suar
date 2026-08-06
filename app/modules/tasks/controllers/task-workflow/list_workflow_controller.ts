import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskWorkflowApiBody } from '../mappers/response/task-status/task_status_response_mapper.js'

import { requireCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'
import ListWorkflowQuery from '#modules/tasks/actions/queries/list_workflow_query'

/**
 * GET /api/workflow
 * List all workflow transitions for current organization.
 */
@inject()
export default class ListWorkflowController {
  constructor(private readonly query: ListWorkflowQuery) {}

  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)
    const rawProjectId = ctx.request.input('project_id', ctx.request.input('projectId'))
    const projectId = typeof rawProjectId === 'string' && rawProjectId.trim()
      ? rawProjectId.trim()
      : null

    const transitions = await this.query
      .executeAndWrap(organizationId, projectId)
      .then((outcome) => outcome.getValue())

    return mapTaskWorkflowApiBody(transitions)
  }
}
