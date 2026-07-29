import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'
import { buildProjectSprintRouteInput } from '#modules/sprints/controllers/mappers/request/project-sprint/project_sprint_request_mapper'
import { mapSprintDataApiBody } from '#modules/sprints/controllers/mappers/response/project-sprint/sprint_response_mapper'


@inject()
export default class ShowProjectSprintController {
  constructor(private readonly queries: SprintQueryFactory) {}

  async handle(ctx: HttpContext) {
    const route = buildProjectSprintRouteInput(ctx.params['projectId'], ctx.params['sprintId'])
    const result = await this.queries.makeDetail(actionContextFromHttp(ctx)).handle(route.project_id, route.sprint_id)

    return mapSprintDataApiBody(result)
  }

}
