import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface ProjectTaskStats {
  projectId: string
  totalTasks: number
  incompleteTasks: number
  completedTasks: number
  pendingReviewSessions: number
}

export interface ProjectTaskStatsReader {
  getTaskStats(projectId: string, trx?: TransactionClientContract): Promise<ProjectTaskStats>

  countTasksByProjectIds(
    projectIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>

  countTasksByAssignees(
    projectId: string,
    userIds?: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>
}
