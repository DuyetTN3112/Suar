import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'
import { mapSprintListApiBody } from '#modules/sprints/controllers/mappers/sprint_response_mapper'

@inject()
export default class ListProjectSprintsController {
  constructor(private readonly queries: SprintQueryFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.queries.makeList(actionContextFromHttp(ctx)).handle({
      projectId: ctx.params['projectId'] as string,
      page: ctx.request.input('page'),
      perPage:
        (ctx.request.input('perPage') as unknown) ??
        (ctx.request.input('per_page') as unknown) ??
        (ctx.request.input('limit') as unknown),
    })

    return mapSprintListApiBody(result)
  }
}
