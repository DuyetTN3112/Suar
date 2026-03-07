import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'
import type { SprintBoardReader } from '#modules/sprints/actions/ports/outbound/sprint_board_reader'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintRepository } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import GetProjectSprintQuery from '#modules/sprints/actions/queries/get_project_sprint_query'
import GetSprintBoardQuery from '#modules/sprints/actions/queries/get_sprint_board_query'
import ListProjectSprintsQuery from '#modules/sprints/actions/queries/list_project_sprints_query'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

export class ComposedSprintQueryFactory extends SprintQueryFactory {
  constructor(
    private readonly dependencies: SprintExternalDependencies,
    private readonly boardReader: SprintBoardReader,
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

  makeList(context: SprintActionContext): ListProjectSprintsQuery {
    return new ListProjectSprintsQuery(context, this.dependencies, this.repository)
  }
}
