import type GetProjectBacklogQuery from '#modules/sprints/actions/queries/project-backlog/get_project_backlog_query'
import type GetProjectSprintQuery from '#modules/sprints/actions/queries/project-sprint/get_project_sprint_query'
import type GetSprintBoardQuery from '#modules/sprints/actions/queries/sprint-board/get_sprint_board_query'
import type ListProjectSprintsQuery from '#modules/sprints/actions/queries/project-sprint/list_project_sprints_query'
import type ListTaskSprintAssignmentHistoryQuery from '#modules/sprints/actions/queries/task-sprint-assignment/list_task_sprint_assignment_history_query'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

export abstract class SprintQueryFactory {
  abstract makeDetail(context: SprintActionContext): GetProjectSprintQuery

  abstract makeBoard(context: SprintActionContext): GetSprintBoardQuery

  abstract makeBacklog(context: SprintActionContext): GetProjectBacklogQuery

  abstract makeHistory(context: SprintActionContext): ListTaskSprintAssignmentHistoryQuery

  abstract makeList(context: SprintActionContext): ListProjectSprintsQuery
}
