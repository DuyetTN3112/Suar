import type { TaskTransaction } from './task_transaction.js'

import type {
  PaginatedTaskApplicationRecords,
  TaskApplicationRecord,
  TaskDetailRecord,
  TaskDetailRelation,
  TaskRecord,
  TaskStatusRecord,
  TaskWorkflowTransitionRecord,
} from '#modules/tasks/types/task_records'

export interface TaskApplicationPageOptions {
  status?: string
  page: number
  perPage: number
}

/**
 * Persistence operations owned by the Tasks module.
 *
 * The application layer keeps use-case ordering and decisions. This port only
 * exposes task-owned reads and mutations required by those command/query
 * handlers.
 */
export abstract class TaskLifecycleRepository {
  abstract findActiveParent(
    taskId: string,
    transaction?: TaskTransaction
  ): Promise<{
    id: string
    organization_id: string
    parent_task_id: string | null
  } | null>

  abstract findTaskDetail(
    taskId: string,
    transaction?: TaskTransaction,
    optionalRelations?: TaskDetailRelation[]
  ): Promise<TaskDetailRecord>

  abstract findActiveTask(
    taskId: string,
    transaction?: TaskTransaction
  ): Promise<TaskRecord>

  abstract findActiveTasksByIds(
    taskIds: string[],
    organizationId: string,
    transaction?: TaskTransaction
  ): Promise<TaskRecord[]>

  abstract lockActiveTask(
    taskId: string,
    transaction: TaskTransaction
  ): Promise<TaskRecord>

  abstract updateTask(
    taskId: string,
    data: Record<string, unknown>,
    transaction: TaskTransaction
  ): Promise<TaskRecord>

  abstract hardDeleteTask(taskId: string, transaction: TaskTransaction): Promise<void>

  abstract countTasksByStatus(
    taskStatusId: string,
    transaction?: TaskTransaction
  ): Promise<number>

  abstract hasReviewableSubmission(
    taskId: string,
    transaction?: TaskTransaction
  ): Promise<boolean>

  abstract listStatuses(
    organizationId: string,
    transaction?: TaskTransaction,
    projectId?: string
  ): Promise<TaskStatusRecord[]>

  abstract findActiveStatus(
    statusId: string,
    organizationId: string,
    transaction?: TaskTransaction,
    projectId?: string
  ): Promise<TaskStatusRecord | null>

  abstract lockStatus(
    statusId: string,
    organizationId: string,
    transaction: TaskTransaction,
    projectId?: string
  ): Promise<TaskStatusRecord | null>

  abstract taskStatusSlugExists(
    organizationId: string,
    slug: string,
    excludeId?: string,
    transaction?: TaskTransaction,
    projectId?: string
  ): Promise<boolean>

  abstract createStatus(
    data: Record<string, unknown>,
    transaction?: TaskTransaction
  ): Promise<TaskStatusRecord>

  abstract updateStatus(
    statusId: string,
    organizationId: string,
    data: Record<string, unknown>,
    transaction: TaskTransaction,
    projectId?: string
  ): Promise<TaskStatusRecord>

  abstract unsetDefaultStatuses(
    organizationId: string,
    transaction?: TaskTransaction,
    projectId?: string
  ): Promise<void>

  abstract softDeleteStatus(
    statusId: string,
    organizationId: string,
    transaction: TaskTransaction,
    projectId?: string
  ): Promise<void>

  abstract listWorkflowTransitions(
    organizationId: string,
    transaction?: TaskTransaction,
    projectId?: string
  ): Promise<TaskWorkflowTransitionRecord[]>

  abstract findWorkflowTransitionsFromStatus(
    organizationId: string,
    fromStatusId: string,
    transaction?: TaskTransaction,
    projectId?: string
  ): Promise<TaskWorkflowTransitionRecord[]>

  abstract createWorkflowTransition(
    data: Record<string, unknown>,
    transaction?: TaskTransaction
  ): Promise<TaskWorkflowTransitionRecord>

  abstract deleteWorkflowTransitions(
    organizationId: string,
    transaction?: TaskTransaction,
    projectId?: string
  ): Promise<void>

  abstract paginateApplicationsByTask(
    taskId: string,
    options: TaskApplicationPageOptions,
    transaction?: TaskTransaction
  ): Promise<PaginatedTaskApplicationRecords>

  abstract paginateApplicationsByOrganization(
    organizationId: string,
    options: TaskApplicationPageOptions,
    transaction?: TaskTransaction
  ): Promise<PaginatedTaskApplicationRecords>

  abstract paginateApplicationsByApplicant(
    applicantId: string,
    options: TaskApplicationPageOptions,
    transaction?: TaskTransaction
  ): Promise<PaginatedTaskApplicationRecords>

  abstract findPendingApplicationOwnedByApplicant(
    applicationId: string,
    applicantId: string,
    transaction?: TaskTransaction
  ): Promise<TaskApplicationRecord | null>

  abstract findPendingApplication(
    applicationId: string,
    transaction?: TaskTransaction
  ): Promise<TaskApplicationRecord | null>

  abstract findExistingApplication(
    taskId: string,
    applicantId: string,
    transaction?: TaskTransaction
  ): Promise<TaskApplicationRecord | null>

  abstract findWithdrawnApplication(
    taskId: string,
    applicantId: string,
    transaction?: TaskTransaction
  ): Promise<TaskApplicationRecord | null>

  abstract createApplication(
    data: Record<string, unknown>,
    transaction?: TaskTransaction
  ): Promise<TaskApplicationRecord>

  abstract updateApplicationStatus(
    applicationId: string,
    data: {
      application_status: TaskApplicationRecord['application_status']
      reviewed_by?: string | null
      reviewed_at?: unknown
      rejection_reason?: string | null
    },
    transaction?: TaskTransaction
  ): Promise<TaskApplicationRecord>

  abstract reviveWithdrawnApplication(
    applicationId: string,
    data: {
      application_source: TaskApplicationRecord['application_source']
      message: string | null
      portfolio_links: string[] | null
      applied_at: unknown
    },
    transaction?: TaskTransaction
  ): Promise<TaskApplicationRecord>

  abstract rejectOtherPendingApplications(
    taskId: string,
    excludedApplicationId: string,
    reviewedBy: string,
    rejectionReason: string,
    transaction?: TaskTransaction
  ): Promise<void>
}
