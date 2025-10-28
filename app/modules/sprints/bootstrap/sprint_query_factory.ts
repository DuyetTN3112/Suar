import GetProjectSprintQuery from '#modules/sprints/actions/queries/get_project_sprint_query'
import GetSprintBoardQuery from '#modules/sprints/actions/queries/get_sprint_board_query'
import ListProjectSprintsQuery from '#modules/sprints/actions/queries/list_project_sprints_query'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { sprintExternalDeps } from '#modules/sprints/bootstrap/sprint_composition_root'

export function makeGetProjectSprintQuery(execCtx: SprintActionContext): GetProjectSprintQuery {
  return new GetProjectSprintQuery(execCtx, sprintExternalDeps)
}

export function makeGetSprintBoardQuery(execCtx: SprintActionContext): GetSprintBoardQuery {
  return new GetSprintBoardQuery(execCtx, sprintExternalDeps)
}

export function makeListProjectSprintsQuery(
  execCtx: SprintActionContext
): ListProjectSprintsQuery {
  return new ListProjectSprintsQuery(execCtx, sprintExternalDeps)
}
