import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  ProjectTaskStats,
  ProjectTaskStatsReader,
} from '#modules/projects/application/ports/project_task_stats_reader'
import { reviewPublicApi } from '#modules/reviews/public_contracts/review_public_api'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'

export class TasksPublicApiProjectTaskStatsReader implements ProjectTaskStatsReader {
  async getTaskStats(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectTaskStats> {
    const [summary, incompleteTasks, pendingReviewSessions] = await Promise.all([
      taskPublicApi.getSummaryByProject(projectId),
      taskPublicApi.countIncompleteByProject(projectId, trx),
      reviewPublicApi.countPendingForProject(projectId, trx),
    ])

    return {
      projectId,
      totalTasks: summary.total,
      incompleteTasks,
      completedTasks: summary.completed,
      pendingReviewSessions,
    }
  }

  async countTasksByProjectIds(
    projectIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return taskPublicApi.countByProjectIds(projectIds, trx)
  }

  async countTasksByAssignees(
    projectId: string,
    userIds?: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return taskPublicApi.countByAssignees(projectId, userIds, trx)
  }
}
