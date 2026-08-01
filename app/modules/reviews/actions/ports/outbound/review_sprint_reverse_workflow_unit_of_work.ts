import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export type ReviewSprintReverseTargetType = 'assigner' | 'environment'

export interface ReviewSprintReverseWorkflow {
  id: string
  sprintId: string
  projectId: string
  organizationId: string
  reviewerId: string
  targetType: ReviewSprintReverseTargetType
  targetUserId: string | null
  targetEntityId: string | null
  responderId: string | null
  status: string
  packageId: string | null
}

export interface ReviewSprintReverseMessageWrite {
  id: string
  workflowId: string
  authorId: string
  messageType: 'accept' | 'report' | 'response' | 'review'
  body: string
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface ReviewSprintReverseNotificationWrite {
  eventName: string
  businessEventId: string
  type: string
  scope: { kind: 'organization'; id: string }
  actor: { type: string; id: string }
  subject: { type: string; id: string }
  parameters: Record<string, unknown>
  occurredAt: string
  correlationId: string
  recipientIds: readonly string[]
  now: Date
}

export interface ReviewSprintManagerReviewWrite {
  id: string
  packageId: string
  targetUserId: string
  rating: number
  comment: string
  createdAt: Date
}

export interface ReviewSprintEnvironmentReviewWrite {
  id: string
  packageId: string
  organizationId: string
  rating: number
  comment: string
  createdAt: Date
}

export interface ReviewSprintReverseWorkflowPersistenceSession {
  loadWorkflowForUpdate(workflowId: string): Promise<ReviewSprintReverseWorkflow | null>
  markAccepted(workflowId: string, acceptedAt: Date): Promise<void>
  markDisputed(workflowId: string, updatedAt: Date): Promise<void>
  markReported(workflowId: string, reportedAt: Date): Promise<void>
  markSubmitted(
    workflowId: string,
    rating: number,
    comment: string,
    submittedAt: Date
  ): Promise<void>
  appendMessage(input: ReviewSprintReverseMessageWrite): Promise<void>
  createManagerReview(input: ReviewSprintManagerReviewWrite): Promise<void>
  createEnvironmentReview(input: ReviewSprintEnvironmentReviewWrite): Promise<void>
  loadReportRuntimeContext(workflow: ReviewSprintReverseWorkflow): Promise<Record<string, unknown>>
  stageNotification(input: ReviewSprintReverseNotificationWrite): Promise<void>
  stageAiDisputeAutoQueue(
    workflow: ReviewSprintReverseWorkflow,
    execCtx: ReviewActionContext
  ): Promise<void>
}

/**
 * Transactional boundary for sprint reverse-review workflow writes.
 *
 * Commands own validation, participant policy, state-transition ordering,
 * target branching, post-commit behavior, and returned outcomes. The adapter
 * owns locking, SQL, transactional notification/AI outbox staging, and commit.
 */
export interface ReviewSprintReverseWorkflowUnitOfWork {
  run<T>(work: (session: ReviewSprintReverseWorkflowPersistenceSession) => Promise<T>): Promise<T>
}
