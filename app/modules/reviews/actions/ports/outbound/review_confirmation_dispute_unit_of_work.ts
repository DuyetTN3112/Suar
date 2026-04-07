import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type {
  ReviewDisputeStatus,
  ReviewSessionStatus,
} from '#modules/reviews/public_contracts/review_constants'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

export interface ReviewConfirmationSessionSnapshot {
  id: string
  taskAssignmentId: string
  revieweeId: string
  status: ReviewSessionStatus
  completedAt: Date | string | null
  confirmations: ReviewConfirmationEntry[]
  creatorReviewCompleted: boolean
  managerReviewsCount: number
  peerReviewsCount: number
  requiredTotalReviews: number
  minimumManagerReviews: number
  minimumPeerReviews: number
}

export interface ReviewConfirmationAssignment {
  id: string
  taskId: string
}

export interface ReviewDisputeInsert {
  reviewSessionId: string
  taskAssignmentId: string
  taskId: string
  revieweeId: string
  openedBy: string
  status: ReviewDisputeStatus
  disputeReason: string
  disputedDimensions: Record<string, unknown> | null
  disputedSkillReviews: Record<string, unknown>[] | null
  requestedOutcome: string
}

export interface ReviewSessionStateWrite {
  reviewSessionId: string
  status: ReviewSessionStatus
  confirmations: ReviewConfirmationEntry[]
  updatedAt: Date
}

export interface ReviewConfirmationAuditWrite {
  action: string
  entityType: 'review_session' | 'review_dispute'
  entityId: string
  userId: string
  newValues: Record<string, unknown>
}

export interface ReviewConfirmedEventStage {
  confirmationId: string
  reviewSessionId: string
  revieweeId: string
  reviewerIds: string[]
  confirmedBy: string
  action: 'confirmed' | 'disputed'
}

export interface TaskReviewAcceptanceWorkflow {
  id: string
  taskId: string
  projectId: string
  revieweeId: string
  completedReviewCount: number
  requiredReviewCount: number
}

export interface ReviewConfirmationDisputePersistenceSession {
  loadSessionForUpdate(reviewSessionId: string): Promise<ReviewConfirmationSessionSnapshot | null>
  loadSessionForAssignmentForUpdate(
    taskAssignmentId: string,
    revieweeId: string
  ): Promise<ReviewConfirmationSessionSnapshot | null>
  loadAssignment(taskAssignmentId: string): Promise<ReviewConfirmationAssignment | null>
  findLatestCompletedAssignment(
    taskId: string,
    assigneeId: string
  ): Promise<ReviewConfirmationAssignment | null>
  listDisputeStatuses(reviewSessionId: string): Promise<string[]>
  createDispute(input: ReviewDisputeInsert): Promise<Record<string, unknown>>
  saveSessionState(input: ReviewSessionStateWrite): Promise<void>
  listReviewerIds(reviewSessionId: string, submittedOnly: boolean): Promise<string[]>
  verifyLinkedEvidence(reviewSessionId: string): Promise<void>
  writeAudit(execCtx: ReviewActionContext, input: ReviewConfirmationAuditWrite): Promise<void>
  stageReviewConfirmedEvent(input: ReviewConfirmedEventStage): Promise<void>
  stageTalentProjection(input: {
    revieweeUserId: string
    sourceEventName: 'review_dispute:created'
    sourceEventId: string
    occurredAt: string
  }): Promise<void>
  loadTaskReviewWorkflowForUpdate(
    workflowId: string
  ): Promise<TaskReviewAcceptanceWorkflow | null>
  markTaskReviewWorkflowAccepted(input: {
    workflowId: string
    actorId: string
    status: string
    messageBody: string
    acceptedAt: Date
  }): Promise<void>
}

/**
 * Atomic persistence boundary for review confirmation, review-dispute opening,
 * and the task-review acceptance bridge.
 *
 * Commands retain policy, quorum, confirmation, event payload, and post-commit
 * decisions. Infrastructure owns transaction mechanics, SQL, evidence
 * verification persistence, audit writes, and outbox staging.
 */
export interface ReviewConfirmationDisputeUnitOfWork {
  run<T>(
    work: (session: ReviewConfirmationDisputePersistenceSession) => Promise<T>
  ): Promise<T>
}
