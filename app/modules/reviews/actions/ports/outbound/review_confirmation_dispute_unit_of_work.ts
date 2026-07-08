import type { ReviewConfirmedAccomplishmentProjectionIdentity } from '#modules/events/public_contracts/domain_event_outbox'
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
  accomplishmentProjection?: ReviewConfirmedAccomplishmentProjectionIdentity | null
}

export interface TaskReviewFinalizedEventStage {
  workflowId: string
  taskAssignmentId: string
  taskId: string
  revieweeId: string
  finalizedBy: string
  finalizationSource: 'consensus'
  finalizedAt: Date
}

export interface TaskReviewAcceptanceWorkflow {
  id: string
  taskId: string
  taskAssignmentId: string | null
  projectId: string
  revieweeId: string
  completedReviewCount: number
  requiredReviewCount: number
  status: string
}

export interface TaskReviewDecisionMessage {
  id: string
  authorId: string
  revieweeDecision: 'accepted' | 'rejected' | null
  requiresReviewerConfirmation: boolean
  reviewerAgreedAt: Date | string | null
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
  resolveAccomplishmentProjectionIdentity?(
    reviewSessionId: string
  ): Promise<ReviewConfirmedAccomplishmentProjectionIdentity | null>
  writeAudit(execCtx: ReviewActionContext, input: ReviewConfirmationAuditWrite): Promise<void>
  stageReviewConfirmedEvent(input: ReviewConfirmedEventStage): Promise<void>
  stageTaskReviewFinalizedEvent(input: TaskReviewFinalizedEventStage): Promise<void>
  stageTalentProjection(input: {
    revieweeUserId: string
    sourceEventName: 'review_dispute:created'
    sourceEventId: string
    occurredAt: string
  }): Promise<void>
  loadTaskReviewWorkflowForUpdate(workflowId: string): Promise<TaskReviewAcceptanceWorkflow | null>
  loadTaskReviewMessageForDecision(
    workflowId: string,
    reviewMessageId: string
  ): Promise<TaskReviewDecisionMessage | null>
  hasTaskRevieweeResponse(workflowId: string, reviewMessageId: string): Promise<boolean>
  decideTaskReviewMessage(input: {
    reviewMessageId: string
    decision: 'accepted' | 'rejected'
    decidedAt: Date
  }): Promise<void>
  acknowledgeReviewerAgreement(input: { reviewMessageId: string; agreedAt: Date }): Promise<void>
  countUnresolvedTaskReviewThreads(workflowId: string): Promise<number>
  updateTaskReviewWorkflowStatus(input: {
    workflowId: string
    status: string
    updatedAt: Date
  }): Promise<void>
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
  run<T>(work: (session: ReviewConfirmationDisputePersistenceSession) => Promise<T>): Promise<T>
}
