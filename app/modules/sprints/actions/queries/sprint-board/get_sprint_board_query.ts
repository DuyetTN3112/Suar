import { BaseQuery } from '#modules/sprints/actions/base_query'
import type { SprintBoardReader } from '#modules/sprints/actions/ports/outbound/sprint-board/sprint_board_reader'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanReadProjectSprints } from '#modules/sprints/domain/project-sprint/project_sprint_access_policy'
import type {
  GetSprintBoardDTO,
  SprintBoardResult,
  SprintBoardSprint,
} from '#modules/sprints/public_contracts/sprint_public_api'

export type {
  GetSprintBoardDTO,
  SprintBoardResult,
  SprintBoardTask,
} from '#modules/sprints/public_contracts/sprint_public_api'

export default class GetSprintBoardQuery extends BaseQuery<
  [GetSprintBoardDTO],
  SprintBoardResult
> {
  constructor(
    private readonly ctx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies,
    private readonly boardReader: SprintBoardReader
  ) {
    super()
  }

  async handle(dto: GetSprintBoardDTO): Promise<SprintBoardResult> {
    const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
      this.ctx,
      dto.project_id
    )
    assertCanReadProjectSprints(access)

    const sprint = await this.resolveSprint(dto)
    const [backlogTasks, sprintTasks] = await Promise.all([
      this.boardReader.listTasks(dto.project_id, null),
      sprint ? this.boardReader.listTasks(dto.project_id, sprint.id) : Promise.resolve([]),
    ])

    return {
      project_id: dto.project_id,
      sprint,
      backlog_tasks: backlogTasks,
      sprint_tasks: sprintTasks,
      counts: {
        backlog_tasks: backlogTasks.length,
        sprint_tasks: sprintTasks.length,
      },
    }
  }

  private resolveSprint(dto: GetSprintBoardDTO): Promise<SprintBoardSprint | null> {
    if (dto.project_sprint_id === null) {
      return Promise.resolve(null)
    }

    return this.boardReader.findSprint(dto.project_id, dto.project_sprint_id)
  }

  async execute(dto: GetSprintBoardDTO): Promise<SprintBoardResult> {
    return this.handle(dto)
  }
}
