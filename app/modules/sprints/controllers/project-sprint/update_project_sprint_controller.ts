import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import { buildUpdateProjectSprintInput } from '#modules/sprints/controllers/mappers/request/project-sprint/project_sprint_request_mapper'
import { mapSprintDataApiBody } from '#modules/sprints/controllers/mappers/response/project-sprint/sprint_response_mapper'


@inject()
export default class UpdateProjectSprintController {
  constructor(private readonly commands: SprintCommandFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.commands.makeUpdate(actionContextFromHttp(ctx)).executeAndWrap(
      buildUpdateProjectSprintInput(ctx.params['projectId'], ctx.params['sprintId'], ctx.request.body())
    ).then((outcome) => outcome.getValue())

    return mapSprintDataApiBody(result)
  }

}
