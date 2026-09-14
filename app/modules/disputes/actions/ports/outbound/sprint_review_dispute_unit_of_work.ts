import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export type SprintReviewDisputeAuthorContext = 'reviewer' | 'org_representative' | 'system_admin'

export interface SprintReviewDisputeAccessContext {
  dispute: {
    id: string
    package_id: string
    opened_by: string
    status: string
    dispute_review_type: string
    reported_to_admin_at: string | null
  }
  reviewPackage: {
    id: string
    reviewer_id: string
  }
  sprint: {
    id: string
    organization_id: string
    project_id: string
  }
  isParticipant: boolean
  authorContext: SprintReviewDisputeAuthorContext | null
}

export interface SprintReviewDisputeComment {
  id: string
  dispute_id: string
  author_id: string
  body: string
  visibility: string
  created_at: string
}

export interface SprintReviewDisputeDetailRow {
  id: string
  package_id: string
  status: string
  dispute_reason: string
  requested_outcome: string
  reported_to_admin_at: string | null
  sprint_id: string
  sprint_name: string
  project_id: string
  project_name: string
  organization_id: string
  organization_name: string
  reviewer_id: string
  package_status: string
}

export interface SprintReviewDisputeAuditWrite {
  action: string
  entityId: string
  newValues: Record<string, unknown>
}

export interface SprintReviewPackageForDispute {
  id: string
  reviewer_id: string
  status: string
}

export interface SprintReviewDisputeCreateInput {
  id: string
  packageId: string
  openedBy: string
  disputeReason: string
  disputeReviewType: string
  requestedOutcome: string
}

export interface SprintReviewDisputePersistenceSession {
  loadPackageForUpdate(packageId: string): Promise<SprintReviewPackageForDispute | null>
  findByPackageId(packageId: string): Promise<{ id: string } | null>
  createDispute(input: SprintReviewDisputeCreateInput): Promise<Record<string, unknown>>
  loadAccess(disputeId: string, actorId: string): Promise<SprintReviewDisputeAccessContext>
  listComments(disputeId: string): Promise<SprintReviewDisputeComment[]>
  loadDetail(disputeId: string): Promise<SprintReviewDisputeDetailRow>
  loadRuntimeContext(
    disputeId: string,
    counterpartyFallbackId: string | null
  ): Promise<Record<string, unknown>>
  createComment(input: {
    id: string
    disputeId: string
    authorId: string
    body: string
    visibility: 'all_parties' | 'admin_only'
  }): Promise<Record<string, unknown>>
  report(input: {
    disputeId: string
    actorId: string
    escalationReason: string
    runtimeContext: Record<string, unknown>
  }): Promise<void>
  writeAudit(execCtx: ReviewActionContext, input: SprintReviewDisputeAuditWrite): Promise<void>
  stageAiEvaluation(disputeId: string, execCtx: ReviewActionContext): Promise<void>
}

export interface SprintReviewDisputeUnitOfWork {
  run<T>(work: (session: SprintReviewDisputePersistenceSession) => Promise<T>): Promise<T>
}
