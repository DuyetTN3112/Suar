import type GetProjectSprintQuery from '#modules/sprints/actions/queries/get_project_sprint_query'
import type GetSprintBoardQuery from '#modules/sprints/actions/queries/get_sprint_board_query'
import type ListProjectSprintsQuery from '#modules/sprints/actions/queries/list_project_sprints_query'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

export abstract class SprintQueryFactory {
  abstract makeDetail(context: SprintActionContext): GetProjectSprintQuery

  abstract makeBoard(context: SprintActionContext): GetSprintBoardQuery

  abstract makeList(context: SprintActionContext): ListProjectSprintsQuery
}
