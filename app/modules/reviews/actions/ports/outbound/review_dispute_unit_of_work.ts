import type { ReviewDisputeAccessContext } from '#modules/reviews/actions/ports/outbound/review_dispute_artifact_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ReviewDisputeCommentWrite {
  disputeId: string
  authorId: string
  body: string
  visibility: 'all_parties' | 'admin_only'
}

export interface ReviewDisputeEvidenceWrite {
  disputeId: string
  actorId: string
  evidenceType: string
  url: string
  title: string | null
  description: string | null
}

export interface ReviewDisputeAuditWrite {
  action: string
  entityId: string
  userId: string
  newValues: Record<string, unknown>
}

export interface ReviewDisputePersistenceSession {
  loadAccess(disputeId: string, actorId: string): Promise<ReviewDisputeAccessContext>
  createComment(input: ReviewDisputeCommentWrite): Promise<Record<string, unknown>>
  createEvidence(input: ReviewDisputeEvidenceWrite): Promise<Record<string, unknown>>
  advancePendingDispute(disputeId: string): Promise<void>
  writeAudit(execCtx: ReviewActionContext, input: ReviewDisputeAuditWrite): Promise<void>
}

/**
 * Transactional persistence boundary for review-dispute mutations.
 *
 * Commands own policy and sequencing. Infrastructure owns the concrete
 * transaction, SQL statements, and transaction-bound audit write.
 */
export interface ReviewDisputeUnitOfWork {
  run<T>(work: (session: ReviewDisputePersistenceSession) => Promise<T>): Promise<T>
}
