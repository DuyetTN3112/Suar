import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskStatusCollectionApiBody } from '../mappers/response/task-status/task_status_response_mapper.js'

import { requireCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'
import ListTaskStatusesQuery from '#modules/tasks/actions/queries/task-status/list_task_statuses_query'

/**
 * GET /api/task-statuses
 * List all active task statuses for current organization.
 */
@inject()
export default class ListTaskStatusesController {
  constructor(private readonly query: ListTaskStatusesQuery) {}

  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)
    const rawProjectId = ctx.request.input('project_id', ctx.request.input('projectId'))
    const projectId = typeof rawProjectId === 'string' && rawProjectId.trim()
      ? rawProjectId.trim()
      : null

    const statuses = await this.query
      .executeAndWrap(organizationId, projectId)
      .then((outcome) => outcome.getValue())

    return mapTaskStatusCollectionApiBody(statuses)
  }
}
