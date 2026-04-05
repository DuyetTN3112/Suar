import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskStatusCollectionApiBody } from '../mappers/response/task_status_response_mapper.js'

import { requireCurrentOrganizationId } from '#modules/http/public_contracts/http_execution_context'
import ListTaskStatusesQuery from '#modules/tasks/actions/queries/list_task_statuses_query'

export default class ListTaskStatusesController {
  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const statuses = await new ListTaskStatusesQuery().execute(organizationId)

    return mapTaskStatusCollectionApiBody(statuses)
  }
}
