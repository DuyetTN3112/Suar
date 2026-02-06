import type { ProjectTransaction } from './project_transaction.js'

export interface ProjectTaskStats {
  projectId: string
  totalTasks: number
  incompleteTasks: number
  completedTasks: number
  pendingReviewSessions: number
}

export abstract class ProjectTaskStatsReader {
  abstract getTaskStats(
    projectId: string,
    transaction?: ProjectTransaction
  ): Promise<ProjectTaskStats>

  abstract countTasksByProjectIds(
    projectIds: string[],
    transaction?: ProjectTransaction
  ): Promise<Map<string, number>>

  abstract countTasksByAssignees(
    projectId: string,
    userIds?: string[],
    transaction?: ProjectTransaction
  ): Promise<Map<string, number>>
}
