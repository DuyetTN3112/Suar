import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { makeListProjectSprintsQuery } from '#modules/sprints/bootstrap/sprint_query_factory'
import { mapSprintListApiBody } from '#modules/sprints/controllers/mappers/sprint_response_mapper'

export default class ListProjectSprintsController {
  async handle(ctx: HttpContext) {
    const result = await makeListProjectSprintsQuery(actionContextFromHttp(ctx)).handle({
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
