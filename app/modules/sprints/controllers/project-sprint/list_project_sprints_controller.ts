import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'
import { buildListProjectSprintsRequest } from '#modules/sprints/controllers/mappers/request/project-sprint/sprint_query_request_mapper'
import { mapSprintListApiBody } from '#modules/sprints/controllers/mappers/response/project-sprint/sprint_response_mapper'


@inject()
export default class ListProjectSprintsController {
  constructor(private readonly queries: SprintQueryFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.queries.makeList(actionContextFromHttp(ctx)).handle(
      buildListProjectSprintsRequest(ctx.params, ctx.request.qs())
    )

    return mapSprintListApiBody(result)
  }

}
