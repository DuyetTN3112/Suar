import type {
  CreateProjectSprintDTO,
} from '#modules/sprints/actions/commands/create_project_sprint_command'
import type {
  MoveTaskToSprintDTO,
} from '#modules/sprints/actions/commands/move_task_to_sprint_command'
import type {
  UpdateProjectSprintDTO,
} from '#modules/sprints/actions/commands/update_project_sprint_command'
import type {
  GetSprintBoardDTO,
  SprintBoardResult,
} from '#modules/sprints/actions/queries/get_sprint_board_query'
import type {
  ListProjectSprintsDTO,
  ListProjectSprintsResult,
} from '#modules/sprints/actions/queries/list_project_sprints_query'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import {
  makeCreateProjectSprintCommand,
  makeMoveTaskToSprintCommand,
  makeUpdateProjectSprintCommand,
} from '#modules/sprints/bootstrap/sprint_action_factory'
import {
  makeGetProjectSprintQuery,
  makeGetSprintBoardQuery,
  makeListProjectSprintsQuery,
} from '#modules/sprints/bootstrap/sprint_query_factory'
import type { ProjectSprintRecord } from '#modules/sprints/types/project_sprint_records'
import type { TaskRecord } from '#modules/tasks/types/task_records'

export class SprintPublicApi {
  async createProjectSprint(
    dto: CreateProjectSprintDTO,
    execCtx: SprintActionContext
  ): Promise<ProjectSprintRecord> {
    return makeCreateProjectSprintCommand(execCtx).execute(dto)
  }

  async listProjectSprints(
    dto: ListProjectSprintsDTO,
    execCtx: SprintActionContext
  ): Promise<ListProjectSprintsResult> {
    return makeListProjectSprintsQuery(execCtx).handle(dto)
  }

  async getProjectSprint(
    projectId: string,
    sprintId: string,
    execCtx: SprintActionContext
  ): Promise<ProjectSprintRecord> {
    return makeGetProjectSprintQuery(execCtx).handle(projectId, sprintId)
  }

  async updateProjectSprint(
    dto: UpdateProjectSprintDTO,
    execCtx: SprintActionContext
  ): Promise<ProjectSprintRecord> {
    return makeUpdateProjectSprintCommand(execCtx).execute(dto)
  }

  async moveTaskToSprint(
    dto: MoveTaskToSprintDTO,
    execCtx: SprintActionContext
  ): Promise<TaskRecord> {
    return makeMoveTaskToSprintCommand(execCtx).execute(dto)
  }

  async getSprintBoard(
    dto: GetSprintBoardDTO,
    execCtx: SprintActionContext
  ): Promise<SprintBoardResult> {
    return makeGetSprintBoardQuery(execCtx).handle(dto)
  }
}

export const sprintPublicApi = new SprintPublicApi()
