import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskStatusCollectionApiBody } from '../mappers/response/task_status_response_mapper.js'

import { requireCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'
import ListTaskStatusesQuery from '#modules/tasks/actions/queries/list_task_statuses_query'

@inject()
export default class ListTaskStatusesController {
  constructor(private readonly query: ListTaskStatusesQuery) {}

  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const statuses = await this.query.execute(organizationId)

    return mapTaskStatusCollectionApiBody(statuses)
  }
}
