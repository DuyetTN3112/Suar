import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import { buildCreateProjectSprintInput } from '#modules/sprints/controllers/mappers/request/project-sprint/project_sprint_request_mapper'
import { mapSprintDataApiBody } from '#modules/sprints/controllers/mappers/response/project-sprint/sprint_response_mapper'


@inject()
export default class CreateProjectSprintController {
  constructor(private readonly commands: SprintCommandFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.commands.makeCreate(actionContextFromHttp(ctx)).executeAndWrap(
      buildCreateProjectSprintInput(ctx.params['projectId'], ctx.request.body())
    ).then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED)
    return mapSprintDataApiBody(result)
  }

}
