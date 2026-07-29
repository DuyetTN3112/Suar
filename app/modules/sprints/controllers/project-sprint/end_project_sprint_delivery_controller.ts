import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import { buildEndProjectSprintDeliveryInput } from '#modules/sprints/controllers/mappers/request/project-sprint/project_sprint_request_mapper'

@inject()
export default class EndProjectSprintDeliveryController {
  constructor(private readonly commands: SprintCommandFactory) {}

  async handle(ctx: HttpContext) {
    const input = buildEndProjectSprintDeliveryInput(
      ctx.params['projectId'],
      ctx.params['sprintId'],
      ctx.request.body()
    )
    const actionContext = actionContextFromHttp(ctx)
    const result = await this.commands
      .makeEndDeliveryAndOpenReview(actionContext)
      .executeAndWrap(input)
      .then((outcome) => outcome.getValue())
    return {
      data: {
        sprint: result.sprint,
        review: result.review,
        historicalTaskIds: result.historical_task_ids,
        movedToBacklogIds: result.moved_to_backlog_ids,
        movedToSprintIds: result.moved_to_sprint_ids,
      },
    }
  }
}
