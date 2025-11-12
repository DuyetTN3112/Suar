import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

export interface TaskPublicApiTaskSummary {
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
}

export interface TaskPublicApiCompletedAssignment {
  id: string
  task_id: string
  assignee_id: string
}

export interface TaskPublicApiRepositoryPort {
  countByAssignees(
    projectId: string,
    userIds?: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>

  countByProjectIds(
    projectIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>

  countIncompleteByProject(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<number>

  getTasksSummaryByProject(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<TaskPublicApiTaskSummary>

  listPreviewByProject(
    projectId: string,
    limit: number,
    trx?: TransactionClientContract
  ): Promise<TaskDetailRecord[]>

  reassignByUser(
    projectId: string,
    fromUserId: string,
    toUserId: string,
    trx?: TransactionClientContract
  ): Promise<void>

  unassignByUserInProjects(
    projectIds: string[],
    userId: string,
    trx?: TransactionClientContract
  ): Promise<void>

  findCompletedAssignment(
    assignmentId: string,
    trx?: TransactionClientContract
  ): Promise<TaskPublicApiCompletedAssignment | null>
}
