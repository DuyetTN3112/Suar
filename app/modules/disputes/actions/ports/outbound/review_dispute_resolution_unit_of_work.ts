import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export type ReviewDisputeResolutionSourceType =
  | 'review_dispute'
  | 'sprint_review_dispute'
  | 'sprint_reverse_review_workflow'
  | 'task_review_workflow'

export type ReviewDisputeResolutionDecision =
  | 'uphold_review'
  | 'adjust_score'
  | 'request_re_review'
  | 'dismiss_dispute'
  | 'partially_accept'

export interface ClassicReviewDisputeResolutionSnapshot {
  status: string
  reviewSessionId: string
}

export interface SprintReviewDisputeResolutionSnapshot {
  id: string
  status: string
  disputeReviewType: string | null
}

export interface SprintReverseReviewResolutionSnapshot {
  id: string
  status: string
  targetType: string
  reviewerId: string
}

export interface TaskReviewResolutionSnapshot {
  id: string
  status: string
  taskId: string
  organizationId: string
  revieweeId: string | null
}

export interface TaskReviewResolutionNotificationWrite {
  workflowId: string
  taskId: string
  organizationId: string
  actorId: string
  recipientIds: string[]
  finalDecision: ReviewDisputeResolutionDecision
  occurredAt: Date
  correlationId?: string
}

export interface ReviewDisputeDossierSnapshot {
  taskSnapshot: unknown
  assignmentSnapshot: unknown
  submissionSnapshot: unknown
  reviewSnapshot: unknown
  skillReviewsSnapshot: unknown
  disputeClaimSnapshot: unknown
  taskCommentsSnapshot: unknown
  evidencesSnapshot: unknown
  selfAssessmentSnapshot: unknown
  taskHistorySnapshot: unknown
  reviewerContextSnapshot: unknown
  revieweeProfileContextSnapshot: unknown
}

export interface ReviewDisputeResolutionWrite {
  disputeId: string
  actorId: string
  finalDecision: ReviewDisputeResolutionDecision
  finalRationale: string
  profileUpdateAction?: string | null
  reviewerCredibilityAction?: string | null
}

export interface ReviewDisputeResolutionAuditWrite {
  entityType: ReviewDisputeResolutionSourceType
  entityId: string
  actorId: string
  finalDecision: ReviewDisputeResolutionDecision
  profileUpdateAction: string | null
  reviewerCredibilityAction: string | null
}

export interface ReviewDisputeResolvedEventWrite {
  disputeId: string
  reviewSessionId: string
  revieweeId: string
  reviewerIds: string[]
  resolvedBy: string
  finalDecision: ReviewDisputeResolutionDecision
  profileUpdateAction?: string | null
  reviewerCredibilityAction?: string | null
}

export interface ReviewDisputeResolutionPersistenceSession {
  findActorSystemRole(actorId: string): Promise<string | null | undefined>
  loadClassicDisputeForUpdate(
    disputeId: string
  ): Promise<ClassicReviewDisputeResolutionSnapshot | null>
  loadSprintDisputeForUpdate(
    disputeId: string
  ): Promise<SprintReviewDisputeResolutionSnapshot | null>
  loadSprintReverseWorkflowForUpdate(
    disputeId: string
  ): Promise<SprintReverseReviewResolutionSnapshot | null>
  loadTaskWorkflowForUpdate(disputeId: string): Promise<TaskReviewResolutionSnapshot | null>
  loadLatestDossier(disputeId: string): Promise<ReviewDisputeDossierSnapshot | null>
  resolveClassicDispute(input: ReviewDisputeResolutionWrite): Promise<Record<string, unknown>>
  resolveSprintDispute(input: ReviewDisputeResolutionWrite): Promise<Record<string, unknown>>
  resolveSprintReverseWorkflow(
    input: ReviewDisputeResolutionWrite
  ): Promise<Record<string, unknown>>
  resolveTaskWorkflow(input: ReviewDisputeResolutionWrite): Promise<Record<string, unknown>>
  listReviewerIds(reviewSessionId: string): Promise<string[]>
  listTaskWorkflowReviewerIds(workflowId: string): Promise<string[]>
  stageTaskWorkflowResolutionNotification(
    input: TaskReviewResolutionNotificationWrite
  ): Promise<void>
  stageResolvedEvent(input: ReviewDisputeResolvedEventWrite): Promise<void>
  writeAudit(execCtx: ReviewActionContext, input: ReviewDisputeResolutionAuditWrite): Promise<void>
}

/**
 * Atomic persistence boundary for resolving every supported review-dispute
 * source. Commands own source routing, policy, readiness, event intent, and
 * sequencing. Infrastructure owns locks, SQL, audit/outbox writes, and commit.
 */
export interface ReviewDisputeResolutionUnitOfWork {
  run<T>(work: (session: ReviewDisputeResolutionPersistenceSession) => Promise<T>): Promise<T>
}
