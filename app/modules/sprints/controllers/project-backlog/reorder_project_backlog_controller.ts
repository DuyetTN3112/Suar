import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import { buildReorderProjectBacklogInput } from '#modules/sprints/controllers/mappers/request/project-sprint/project_sprint_request_mapper'

@inject()
export default class ReorderProjectBacklogController {
  constructor(private readonly commands: SprintCommandFactory) {}

  async handle(ctx: HttpContext) {
    const input = buildReorderProjectBacklogInput(
      ctx.params['projectId'],
      ctx.params['taskId'],
      ctx.request.body()
    )
    const result = await this.commands
      .makeReorderBacklog(actionContextFromHttp(ctx))
      .executeAndWrap(input)
      .then((outcome) => outcome.getValue())
    return wrapApiV1Data({ id: result.id, projectId: result.project_id, projectSprintId: null, updatedAt: result.updated_at })
  }
}
