import type { SprintBoardTask } from '#modules/sprints/public_contracts/sprint_public_api'

export interface ProjectBacklogReader {
  list(projectId: string, offset: number, limit: number, statuses?: string[]): Promise<{
    tasks: SprintBoardTask[]
    total: number
  }>
}
