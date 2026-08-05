import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { TaskAssignmentInteractionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_assignment_interaction_command_factory'
import {
  buildAcknowledgeTaskAssignmentInput,
  buildRequestTaskAssignmentClarificationInput,
} from '#modules/tasks/controllers/mappers/request/task-assignment/task_assignment_interaction_request_mapper'


@inject()
export default class TaskAssignmentInteractionController {
  constructor(private readonly commands: TaskAssignmentInteractionCommandFactory) {}

  async acknowledge(ctx: HttpContext) {
    const result = await this.commands
      .makeAcknowledge(actionContextFromHttp(ctx))
      .executeAndWrap(buildAcknowledgeTaskAssignmentInput(ctx.params, ctx.request.body()))
      .then((outcome) => outcome.getValue())

    return { data: result }
  }

  async requestClarification(ctx: HttpContext) {
    const result = await this.commands
      .makeClarification(actionContextFromHttp(ctx))
      .executeAndWrap(
        buildRequestTaskAssignmentClarificationInput(ctx.params, ctx.request.body())
      )
      .then((outcome) => outcome.getValue())

    return { data: result }
  }


}
