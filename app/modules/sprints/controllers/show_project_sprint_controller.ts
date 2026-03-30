import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'
import { mapSprintDataApiBody } from '#modules/sprints/controllers/mappers/sprint_response_mapper'

@inject()
export default class ShowProjectSprintController {
  constructor(private readonly queries: SprintQueryFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.queries.makeDetail(actionContextFromHttp(ctx)).handle(
      ctx.params['projectId'] as string,
      ctx.params['sprintId'] as string
    )

    return mapSprintDataApiBody(result)
  }
}
