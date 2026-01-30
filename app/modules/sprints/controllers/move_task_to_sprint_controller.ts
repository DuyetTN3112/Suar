import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import type { SprintTaskAssignmentRecord } from '#modules/sprints/public_contracts/sprint_task_assignment'

@inject()
export default class MoveTaskToSprintController {
  constructor(private readonly commands: SprintCommandFactory) {}

  async handle(ctx: HttpContext) {
    const body = ctx.request.body() as Record<string, unknown>
    const task = await this.commands.makeMoveTask(actionContextFromHttp(ctx)).execute({
      project_id: ctx.params['projectId'] as string,
      task_id: ctx.params['taskId'] as string,
      project_sprint_id: readSprintId(body['projectSprintId'] ?? body['project_sprint_id']),
    })

    ctx.response.status(HttpStatus.OK)
    return wrapApiV1Data(mapTaskSprintResponse(task))
  }
}

function readSprintId(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function mapTaskSprintResponse(task: SprintTaskAssignmentRecord) {
  return {
    id: task.id,
    projectId: task.project_id,
    projectSprintId: task.project_sprint_id ?? null,
    updatedAt: task.updated_at ?? null,
  }
}
