import type { ReviewTransaction } from './review_transaction.js'

import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { TaskReviewWorkflowStatus } from '#modules/reviews/domain/task_review_workflow'

export interface ReviewTaskWorkflow {
  id: string
  taskId: string
  projectId: string
  organizationId: string
  revieweeId: string | null
  status: TaskReviewWorkflowStatus
  requiredReviewCount: number
}

export interface ReviewTaskWorkflowSeed {
  taskId: string
  projectId: string
  organizationId: string
  revieweeId: string | null
  assignerId: string | null
  creatorId: string
}

export interface ReviewTaskReviewerCandidate {
  userId: string
  projectRole: string | null
  organizationRole: string | null
}

export interface ReviewTaskReviewer {
  id: string
  status: string
}

export interface ReviewTaskWorkflowNotificationWrite {
  eventName: string
  businessEventId: string
  type: string
  organizationId: string
  actorId: string
  taskId: string
  parameters: Record<string, unknown>
  recipientIds: readonly string[]
  occurredAt: Date
  correlationId?: string
}

export interface ReviewTaskWorkflowPersistenceSession {
  findWorkflowByTaskId(taskId: string): Promise<ReviewTaskWorkflow | null>
  loadWorkflow(workflowId: string): Promise<ReviewTaskWorkflow | null>
  loadWorkflowSeed(taskId: string): Promise<ReviewTaskWorkflowSeed | null>
  listReviewerCandidates(
    projectId: string,
    organizationId: string,
    excludedUserIds: readonly string[]
  ): Promise<ReviewTaskReviewerCandidate[]>
  createWorkflow(input: {
    taskId: string
    projectId: string
    organizationId: string
    revieweeId: string | null
    requiredReviewCount: number
  }): Promise<ReviewTaskWorkflow | null>
  createWorkflowReviewers(
    workflowId: string,
    reviewers: ReadonlyArray<{ reviewerId: string; role: string; priorityRank: number }>
  ): Promise<void>
  loadTaskAssignee(taskId: string): Promise<string | null | undefined>
  findReviewer(workflowId: string, reviewerId: string): Promise<ReviewTaskReviewer | null>
  listReviewerIds(workflowId: string): Promise<string[]>
  markReviewerSubmitted(reviewerId: string, reviewedAt: Date): Promise<void>
  appendMessage(input: {
    workflowId: string
    authorId: string
    messageType: 'review' | 'reviewee_response' | 'system'
    body: string
    metadata?: Record<string, unknown>
  }): Promise<void>
  countSubmittedReviewers(workflowId: string): Promise<number>
  updateWorkflowProgress(input: {
    workflowId: string
    completedReviewCount: number
    status: TaskReviewWorkflowStatus
    updatedAt: Date
  }): Promise<void>
  markDisputed(workflowId: string, updatedAt: Date): Promise<void>
  loadReportRuntimeContext(
    workflowId: string,
    reporterId: string,
    reportReason: string
  ): Promise<Record<string, unknown>>
  markReported(input: {
    workflowId: string
    reporterId: string
    runtimeContext: Record<string, unknown>
    reportedAt: Date
  }): Promise<void>
  stageNotification(input: ReviewTaskWorkflowNotificationWrite): Promise<void>
  stageAiDisputeAutoQueue(workflowId: string, execCtx: ReviewActionContext): Promise<void>
}

/**
 * Transactional persistence boundary for task-review workflow mutations.
 *
 * Commands own participant policy, reviewer selection, state decisions,
 * notification semantics, and post-commit ordering. Infrastructure owns SQL,
 * Lucid transaction handling, context hydration, and transactional staging.
 */
export interface ReviewTaskWorkflowUnitOfWork {
  run<T>(work: (session: ReviewTaskWorkflowPersistenceSession) => Promise<T>): Promise<T>
  runIn<T>(
    transaction: ReviewTransaction,
    work: (session: ReviewTaskWorkflowPersistenceSession) => Promise<T>
  ): Promise<T>
}
