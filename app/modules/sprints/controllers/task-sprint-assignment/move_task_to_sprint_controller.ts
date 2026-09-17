import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import { buildMoveTaskToSprintInput } from '#modules/sprints/controllers/mappers/request/task-sprint-assignment/task_sprint_assignment_request_mapper'
import type { SprintTaskAssignmentRecord } from '#modules/sprints/public_contracts/task-sprint-assignment/sprint_task_assignment'

@inject()
export default class MoveTaskToSprintController {
  constructor(private readonly commands: SprintCommandFactory) {}

  async handle(ctx: HttpContext) {
    const input = buildMoveTaskToSprintInput(
      ctx.params['projectId'],
      ctx.params['taskId'],
      ctx.request.body()
    )
    const task = await this.commands
      .makeMoveTask(actionContextFromHttp(ctx))
      .executeAndWrap(input)
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.OK)
    return wrapApiV1Data(mapTaskSprintResponse(task))
  }
}

function mapTaskSprintResponse(task: SprintTaskAssignmentRecord) {
  return {
    id: task.id,
    projectId: task.project_id,
    projectSprintId: task.project_sprint_id ?? null,
    updatedAt: task.updated_at ?? null,
  }
}
