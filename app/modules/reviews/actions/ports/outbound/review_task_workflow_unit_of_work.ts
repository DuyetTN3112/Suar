import type { ReviewTransaction } from './review_transaction.js'

import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { TaskReviewWorkflowStatus } from '#modules/reviews/domain/task-review/task_review_workflow'

export interface ReviewTaskWorkflow {
  id: string
  taskId: string
  /** Null only for pre-assignment-pin legacy workflows. */
  taskAssignmentId: string | null
  projectId: string
  organizationId: string
  revieweeId: string | null
  status: TaskReviewWorkflowStatus
  requiredReviewCount: number
}

export interface ReviewTaskWorkflowSeed {
  taskId: string
  taskAssignmentId: string
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

/** A non-mandatory reviewer suggestion with the reason it is relevant to the task. */
export interface ReviewTaskReviewerSuggestion extends ReviewTaskReviewerCandidate {
  reasons: string[]
}

export interface ReviewTaskReviewer {
  id: string
  status: string
}

export interface TaskReviewMessage {
  id: string
  authorId: string
  messageType: 'review' | 'reviewee_response' | 'dispute_reply' | 'system'
  revieweeDecision?: 'accepted' | 'rejected' | null
}

export interface WithdrawnTaskReviewMessage {
  messageType: TaskReviewMessage['messageType']
}

/**
 * A formal report is deliberately separate from task comments and review replies.
 * It is the immutable claimant submission included in the AI arbitration package.
 */
export interface TaskReviewDisputeReport {
  disputeType:
    | 'deadline'
    | 'scope'
    | 'missing_context'
    | 'scope_change'
    | 'review_fairness'
    | 'review_score'
    | 'other'
  claim: string
  evidence: string
  requestedOutcome:
    | 'task_giver_re_review'
    | 'reviewer_re_review'
    | 'independent_re_review'
    | 'adjust_scope_or_deadline'
    | 'adjust_score'
    | 'keep_current_review'
    | 'admin_review'
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

export interface TaskReviewWorkflowFinalizationWrite {
  workflowId: string
  actorId: string
  finalizedAt: Date
  messageBody: string
}

export interface TaskReviewFinalizedEventWrite {
  workflowId: string
  taskAssignmentId: string
  taskId: string
  revieweeId: string
  finalizedBy: string
  finalizationSource: 'admin_resolution' | 'organization_governance'
  finalizedAt: Date
}

export interface ReviewTaskWorkflowPersistenceSession {
  findWorkflowByTaskAssignmentId(taskAssignmentId: string): Promise<ReviewTaskWorkflow | null>
  listNativeWorkflowsByTaskId(taskId: string): Promise<ReviewTaskWorkflow[]>
  loadWorkflow(workflowId: string): Promise<ReviewTaskWorkflow | null>
  loadWorkflowSeed(taskId: string, taskAssignmentId: string): Promise<ReviewTaskWorkflowSeed | null>
  listReviewerCandidates(
    projectId: string,
    organizationId: string,
    excludedUserIds: readonly string[]
  ): Promise<ReviewTaskReviewerCandidate[]>
  listSuggestedReviewerCandidates(
    taskId: string,
    projectId: string,
    organizationId: string,
    excludedUserIds: readonly string[]
  ): Promise<ReviewTaskReviewerSuggestion[]>
  createWorkflow(input: {
    taskId: string
    taskAssignmentId: string
    projectId: string
    organizationId: string
    revieweeId: string | null
    requiredReviewCount: number
  }): Promise<ReviewTaskWorkflow | null>
  createWorkflowReviewers(
    workflowId: string,
    reviewers: ReadonlyArray<{
      reviewerId: string
      role: string
      priorityRank: number
      isRequired?: boolean
    }>
  ): Promise<void>
  loadTaskAssignee(taskId: string): Promise<string | null | undefined>
  findReviewer(workflowId: string, reviewerId: string): Promise<ReviewTaskReviewer | null>
  findMessage(workflowId: string, messageId: string): Promise<TaskReviewMessage | null>
  hasRevieweeResponse(workflowId: string, reviewMessageId: string): Promise<boolean>
  countUnrespondedReviewThreads(workflowId: string): Promise<number>
  listReviewerIds(workflowId: string): Promise<string[]>
  markReviewerSubmitted(reviewerId: string, reviewedAt: Date): Promise<void>
  updateSubmittedReview(input: {
    workflowId: string
    authorId: string
    body: string
  }): Promise<boolean>
  updateOwnMessage(input: {
    workflowId: string
    messageId: string
    authorId: string
    messageTypes: Array<'reviewee_response' | 'dispute_reply'>
    body: string
  }): Promise<boolean>
  withdrawOwnMessage(input: {
    workflowId: string
    messageId: string
    authorId: string
    withdrawnAt: Date
  }): Promise<WithdrawnTaskReviewMessage | null>
  appendMessage(input: {
    workflowId: string
    authorId: string
    messageType: 'review' | 'reviewee_response' | 'dispute_reply' | 'system'
    body: string
    parentReviewMessageId?: string
    metadata?: Record<string, unknown>
  }): Promise<string>
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
    report: TaskReviewDisputeReport
  ): Promise<Record<string, unknown>>
  markReported(input: {
    workflowId: string
    reporterId: string
    runtimeContext: Record<string, unknown>
    reportedAt: Date
  }): Promise<void>
  finalizeResolvedWorkflow(input: TaskReviewWorkflowFinalizationWrite): Promise<void>
  stageTaskReviewFinalizedEvent(input: TaskReviewFinalizedEventWrite): Promise<void>
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
