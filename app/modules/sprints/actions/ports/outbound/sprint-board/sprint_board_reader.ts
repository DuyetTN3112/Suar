import type {
  SprintBoardSprint,
  SprintBoardTask,
} from '#modules/sprints/public_contracts/sprint_public_api'

export type {
  SprintBoardSprint,
  SprintBoardTask,
} from '#modules/sprints/public_contracts/sprint_public_api'

export interface SprintBoardReader {
  findSprint(projectId: string, sprintId?: string): Promise<SprintBoardSprint | null>
  listTasks(projectId: string, sprintId: string | null): Promise<SprintBoardTask[]>
}
