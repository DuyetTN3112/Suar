import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'
import type { SprintBoardResult } from '#modules/sprints/public_contracts/sprint_public_api'

@inject()
export default class GetSprintBoardController {
  constructor(private readonly queries: SprintQueryFactory) {}

  async handle(ctx: HttpContext) {
    const projectSprintInput: unknown = ctx.request.input('projectSprintId')
    const projectSprintId = readSprintId(
      projectSprintInput === undefined
        ? ctx.request.input('project_sprint_id')
        : projectSprintInput
    )
    const projectId = readProjectId(ctx.params['projectId'] as unknown)
    const result = await this.queries
      .makeBoard(actionContextFromHttp(ctx))
      .executeAndWrap({
        project_id: projectId,
        ...(projectSprintId !== undefined ? { project_sprint_id: projectSprintId } : {}),
      })
      .then((outcome) => outcome.getValue())

    return wrapApiV1Data(mapSprintBoardResponse(result))
  }
}

function readSprintId(value: unknown): string | null | undefined {
  if (value === null) return null
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    throw ValidationException.field('projectSprintId', 'projectSprintId must be a string')
  }
  return value.trim() || null
}

function readProjectId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw ValidationException.field('projectId', 'projectId must be a non-empty string')
  }
  return value.trim()
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
