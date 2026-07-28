import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'
import { buildGetProjectBacklogRequest } from '#modules/sprints/controllers/mappers/request/project-sprint/sprint_query_request_mapper'


@inject()
export default class GetProjectBacklogController {
  constructor(private readonly queries: SprintQueryFactory) {}

  async handle(ctx: HttpContext) {
    const input = buildGetProjectBacklogRequest(ctx.params, ctx.request.qs())
    const outcome = await this.queries.makeBacklog(actionContextFromHttp(ctx)).executeAndWrap(
      input
    )
    const result = outcome.getValue()
    return wrapApiV1Data({
      projectId: result.project_id,
      tasks: result.tasks,
      counts: result.counts,
      pagination: result.pagination,
    })
  }

}
