import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import type { SprintBoardResult } from '#modules/sprints/actions/queries/get_sprint_board_query'
import { makeGetSprintBoardQuery } from '#modules/sprints/bootstrap/sprint_query_factory'

export default class GetSprintBoardController {
  async handle(ctx: HttpContext) {
    const projectSprintId = readSprintId(
      ctx.request.input('projectSprintId', ctx.request.input('project_sprint_id'))
    )
    const result = await makeGetSprintBoardQuery(actionContextFromHttp(ctx)).handle({
      project_id: ctx.params['projectId'] as string,
      ...(projectSprintId !== undefined ? { project_sprint_id: projectSprintId } : {}),
    })

    return wrapApiV1Data(mapSprintBoardResponse(result))
  }
}

function readSprintId(value: unknown): string | null | undefined {
  if (value === null) return null
  return typeof value === 'string' ? value : undefined
}

function mapSprintBoardResponse(result: SprintBoardResult) {
  return {
    projectId: result.project_id,
    sprint: result.sprint
      ? {
          id: result.sprint.id,
          name: result.sprint.name,
          goal: result.sprint.goal,
          status: result.sprint.status,
          startsAt: result.sprint.starts_at,
          endsAt: result.sprint.ends_at,
        }
      : null,
    backlogTasks: result.backlog_tasks.map(mapTask),
    sprintTasks: result.sprint_tasks.map(mapTask),
    counts: {
      backlogTasks: result.counts.backlog_tasks,
      sprintTasks: result.counts.sprint_tasks,
    },
  }
}

function mapTask(task: SprintBoardResult['backlog_tasks'][number]) {
  return {
    id: task.id,
    title: task.title,
    taskStatusId: task.task_status_id,
    status: task.status,
    priority: task.priority,
    assignedTo: task.assigned_to,
    projectSprintId: task.project_sprint_id,
    sortOrder: task.sort_order,
    updatedAt: task.updated_at,
  }
}
