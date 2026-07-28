import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import { buildStartProjectSprintInput } from '#modules/sprints/controllers/mappers/request/project-sprint/project_sprint_request_mapper'
import { mapSprintDataApiBody } from '#modules/sprints/controllers/mappers/response/project-sprint/sprint_response_mapper'

@inject()
export default class StartProjectSprintController {
  constructor(private readonly commands: SprintCommandFactory) {}

  async handle(ctx: HttpContext) {
    const input = buildStartProjectSprintInput(ctx.params['projectId'], ctx.params['sprintId'])
    const result = await this.commands
      .makeStart(actionContextFromHttp(ctx))
      .executeAndWrap(input)
      .then((outcome) => outcome.getValue())
    return mapSprintDataApiBody(result)
  }
}
