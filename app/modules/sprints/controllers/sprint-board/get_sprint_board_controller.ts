import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'
import { buildSprintBoardRequest } from '#modules/sprints/controllers/mappers/request/sprint-board/sprint_board_request_mapper'
import type { SprintBoardResult } from '#modules/sprints/public_contracts/sprint_public_api'

@inject()
export default class GetSprintBoardController {
  constructor(private readonly queries: SprintQueryFactory) {}

  async handle(ctx: HttpContext) {
    const input = buildSprintBoardRequest(ctx.params, ctx.request)
    const result = await this.queries
      .makeBoard(actionContextFromHttp(ctx))
      .executeAndWrap(input)
      .then((outcome) => outcome.getValue())

    return wrapApiV1Data(mapSprintBoardResponse(result))
  }
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
