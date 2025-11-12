import type { HttpContext } from '@adonisjs/core/http'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { makeMoveTaskToSprintCommand } from '#modules/sprints/bootstrap/sprint_action_factory'
import type { TaskRecord } from '#modules/tasks/types/task_records'

export default class MoveTaskToSprintController {
  async handle(ctx: HttpContext) {
    const body = ctx.request.body() as Record<string, unknown>
    const task = await makeMoveTaskToSprintCommand(actionContextFromHttp(ctx)).execute({
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

function mapTaskSprintResponse(task: TaskRecord) {
  return {
    id: task.id,
    projectId: task.project_id,
    projectSprintId: task.project_sprint_id ?? null,
    updatedAt: task.updated_at ?? null,
  }
}
