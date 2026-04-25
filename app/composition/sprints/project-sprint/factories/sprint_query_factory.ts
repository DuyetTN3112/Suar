import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'
import type { ProjectBacklogReader } from '#modules/sprints/actions/ports/outbound/project-backlog/project_backlog_reader'
import type { SprintBoardReader } from '#modules/sprints/actions/ports/outbound/sprint-board/sprint_board_reader'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintRepository } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import GetProjectBacklogQuery from '#modules/sprints/actions/queries/project-backlog/get_project_backlog_query'
import GetProjectSprintQuery from '#modules/sprints/actions/queries/project-sprint/get_project_sprint_query'
import GetSprintBoardQuery from '#modules/sprints/actions/queries/sprint-board/get_sprint_board_query'
import ListProjectSprintsQuery from '#modules/sprints/actions/queries/project-sprint/list_project_sprints_query'
import ListTaskSprintAssignmentHistoryQuery from '#modules/sprints/actions/queries/task-sprint-assignment/list_task_sprint_assignment_history_query'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

export class ComposedSprintQueryFactory extends SprintQueryFactory {
  constructor(
    private readonly dependencies: SprintExternalDependencies,
    private readonly boardReader: SprintBoardReader,
    private readonly backlogReader: ProjectBacklogReader,
    private readonly repository: SprintRepository
  ) {
    super()
  }

  makeDetail(context: SprintActionContext): GetProjectSprintQuery {
    return new GetProjectSprintQuery(context, this.dependencies, this.repository)
  }

  makeBoard(context: SprintActionContext): GetSprintBoardQuery {
    return new GetSprintBoardQuery(context, this.dependencies, this.boardReader)
  }

  makeBacklog(context: SprintActionContext): GetProjectBacklogQuery {
    return new GetProjectBacklogQuery(context, this.dependencies, this.backlogReader)
  }

  makeHistory(context: SprintActionContext): ListTaskSprintAssignmentHistoryQuery {
    return new ListTaskSprintAssignmentHistoryQuery(context, this.dependencies, this.repository)
  }

  makeList(context: SprintActionContext): ListProjectSprintsQuery {
    return new ListProjectSprintsQuery(context, this.dependencies, this.repository)
  }
}
