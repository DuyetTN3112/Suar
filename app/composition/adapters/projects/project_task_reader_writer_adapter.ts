import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  ProjectTaskReaderWriter,
  type ProjectTaskPreview,
  type ProjectTaskSummary,
} from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import {
  collectTaskUserIdentityIds,
  mapTaskListUserProjections,
} from '#modules/tasks/actions/mappers/task-reading/task_user_projection_mapper'
import type { TaskUserReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import * as aggregateQueries from '#modules/tasks/infra/repositories/task-reading/read/aggregate_queries'
import * as detailQueries from '#modules/tasks/infra/repositories/task-reading/read/detail_queries'
import * as taskAggregateMutations from '#modules/tasks/infra/repositories/task-authoring/write/task_aggregate_mutations'

export class ProjectTaskReaderWriterAdapter extends ProjectTaskReaderWriter {
  constructor(private readonly taskUserReader: Pick<TaskUserReader, 'findUserIdentities'>) {
    super()
  }

  countByAssignees(
    projectId: string,
    userIds?: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return aggregateQueries.countByAssignees(projectId, userIds, trx)
  }

  countByProjectIds(
    projectIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return aggregateQueries.countByProjectIds(projectIds, trx)
  }

  countIncompleteByProject(projectId: string, trx?: TransactionClientContract): Promise<number> {
    return aggregateQueries.countIncompleteByProject(projectId, trx)
  }

  getSummaryByProject(projectId: string): Promise<ProjectTaskSummary> {
    return aggregateQueries.getTasksSummaryByProject(projectId)
  }

  async listPreviewByProject(projectId: string, limit: number): Promise<ProjectTaskPreview[]> {
    const taskRecords = await detailQueries.listPreviewByProjectAsRecords(projectId, limit)
    const identityIds = collectTaskUserIdentityIds(taskRecords, false)
    const identities =
      identityIds.length > 0
        ? await this.taskUserReader.findUserIdentities(identityIds)
        : []
    const tasks = mapTaskListUserProjections(taskRecords, identities)
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      task_status_id: task.task_status_id,
      priority: task.priority,
      assignee_name: task.assigned_to ? (task.assignee?.username ?? null) : null,
      due_date: task.due_date ?? null,
    }))
  }

  async reassignByUser(
    projectId: string,
    fromUserId: string,
    toUserId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await taskAggregateMutations.reassignByUser(projectId, fromUserId, toUserId, trx)
  }
}
