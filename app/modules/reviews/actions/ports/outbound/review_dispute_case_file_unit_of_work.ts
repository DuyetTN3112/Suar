import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface BuiltReviewDisputeCaseFile {
  id: string
  caseVersion: number
  completenessScore: number
  row: Record<string, unknown>
}

export interface ReviewDisputeReportSnapshot {
  id: string
  status: string
  revieweeId: string
  taskId: string
  reportedToAdminAt: string | Date | null
}

export interface ReviewDisputeReportTask {
  organizationId: string
  title: string
}

export interface ReviewDisputeReportTransition {
  disputeId: string
  actorId: string
  escalationReason: string
  status: string
  now: Date
}

export interface ReviewDisputeCaseFileAuditWrite {
  action: string
  entityId: string
  userId: string
  newValues: Record<string, unknown>
}

export interface ReviewDisputeNotificationStage {
  eventName: string
  businessEventId: string
  type: string
  organizationId: string
  actorId: string
  taskId: string
  occurredAt: string
  correlationId?: string
  parameters: Record<string, unknown>
  recipientIds: readonly string[]
  now: Date
}

export interface ReviewDisputeCaseFilePersistenceSession {
  loadDisputeForReport(disputeId: string): Promise<ReviewDisputeReportSnapshot | null>
  loadReportTask(taskId: string): Promise<ReviewDisputeReportTask | null>
  listPublicExchangeAuthorIds(disputeId: string): Promise<string[]>
  listAdminUserIds(excludedUserId: string): Promise<string[]>
  transitionToAdminReviewing(input: ReviewDisputeReportTransition): Promise<void>
  buildCaseFile(disputeId: string, actorId: string): Promise<BuiltReviewDisputeCaseFile>
  writeAudit(
    execCtx: ReviewActionContext,
    input: ReviewDisputeCaseFileAuditWrite
  ): Promise<void>
  stageNotification(input: ReviewDisputeNotificationStage): Promise<void>
  stageAiDisputeEvaluation(
    disputeId: string,
    requestContext: ReviewActionContext & { organizationId: string }
  ): Promise<void>
}

/**
 * Atomic persistence boundary shared by the explicit case-file build and
 * review-dispute escalation use cases.
 *
 * Commands retain authentication, policy decisions, business sequencing, and
 * post-commit effects. Infrastructure owns the concrete transaction, SQL,
 * transaction-bound audit writes, and staged outbox records.
 */
export interface ReviewDisputeCaseFileUnitOfWork {
  run<T>(work: (session: ReviewDisputeCaseFilePersistenceSession) => Promise<T>): Promise<T>
}
