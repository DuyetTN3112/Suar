import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { reviewPublicApi } from '#composition/review_public_api_composition'
import {
  ProjectTaskStatsReader,
  type ProjectTaskStats,
} from '#modules/projects/actions/ports/outbound/project_task_stats_reader'
import ReviewAssignmentContextV1Query from '#modules/tasks/actions/queries/review_assignment_context_v1_query'
import { LucidTaskFactSourceReader } from '#modules/tasks/infra/adapters/lucid_task_fact_source_reader'
import * as aggregateQueries from '#modules/tasks/infra/repositories/read/aggregate_queries'

export class ProjectTaskStatsReaderAdapter extends ProjectTaskStatsReader {
  private readonly assignmentContexts = new ReviewAssignmentContextV1Query(
    new LucidTaskFactSourceReader()
  )

  async getTaskStats(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectTaskStats> {
    const [summary, incompleteTasks, taskAssignmentIds] = await Promise.all([
      aggregateQueries.getTasksSummaryByProject(projectId, trx),
      aggregateQueries.countIncompleteByProject(projectId, trx),
      this.assignmentContexts.listAssignmentIdsByProjectIds([projectId], trx),
    ])
    const pendingReviewSessions = await reviewPublicApi.countPendingForTaskAssignmentIds(
      taskAssignmentIds,
      trx
    )

    return {
      projectId,
      totalTasks: summary.total,
      incompleteTasks,
      completedTasks: summary.completed,
      pendingReviewSessions,
    }
  }

  countTasksByProjectIds(
    projectIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return aggregateQueries.countByProjectIds(projectIds, trx)
  }

  countTasksByAssignees(
    projectId: string,
    userIds?: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return aggregateQueries.countByAssignees(projectId, userIds, trx)
  }
}
