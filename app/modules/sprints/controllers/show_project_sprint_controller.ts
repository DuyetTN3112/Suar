import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { makeGetProjectSprintQuery } from '#modules/sprints/bootstrap/sprint_query_factory'
import { mapSprintDataApiBody } from '#modules/sprints/controllers/mappers/sprint_response_mapper'

export default class ShowProjectSprintController {
  async handle(ctx: HttpContext) {
    const result = await makeGetProjectSprintQuery(actionContextFromHttp(ctx)).handle(
      ctx.params['projectId'] as string,
      ctx.params['sprintId'] as string
    )

    return mapSprintDataApiBody(result)
  }
}
