import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskWorkflowApiBody } from '../mappers/response/task_status_response_mapper.js'

import { requireCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'
import ListWorkflowQuery from '#modules/tasks/actions/queries/list_workflow_query'

@inject()
export default class ListWorkflowController {
  constructor(private readonly query: ListWorkflowQuery) {}

  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const transitions = await this.query.execute(organizationId)

    return mapTaskWorkflowApiBody(transitions)
  }
}
