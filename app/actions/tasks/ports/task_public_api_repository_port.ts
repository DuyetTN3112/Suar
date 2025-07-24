import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { DatabaseId } from '#types/database'
import type { TaskDetailRecord } from '#types/task_records'

export interface TaskPublicApiTaskSummary {
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
}

export interface TaskPublicApiCompletedAssignment {
  id: DatabaseId
  task_id: DatabaseId
  assignee_id: DatabaseId
}

export interface TaskPublicApiRepositoryPort {
  countByAssignees(
    projectId: DatabaseId,
    userIds?: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>

  countByProjectIds(
    projectIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>

  countIncompleteByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number>

  getTasksSummaryByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskPublicApiTaskSummary>

  listPreviewByProject(
    projectId: DatabaseId,
    limit: number,
    trx?: TransactionClientContract
  ): Promise<TaskDetailRecord[]>

  reassignByUser(
    projectId: DatabaseId,
    fromUserId: DatabaseId,
    toUserId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void>

  unassignByUserInProjects(
    projectIds: DatabaseId[],
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void>

  findCompletedAssignment(
    assignmentId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskPublicApiCompletedAssignment | null>
}
