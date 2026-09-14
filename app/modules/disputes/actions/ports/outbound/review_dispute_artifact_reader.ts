export type ReviewDisputeAuthorContext =
  | 'reviewee'
  | 'reviewer'
  | 'org_owner'
  | 'org_admin'
  | 'project_manager'
  | 'system_admin'

export interface ReviewDisputeAccessContext {
  dispute: {
    id: string
    status: string
    reviewee_id: string
    review_session_id: string
    task_assignment_id: string
    task_id: string
  }
  authorContext: ReviewDisputeAuthorContext | null
  isParticipant: boolean
  canRespond: boolean
}

export interface ReviewDisputeArtifactSnapshot {
  access: ReviewDisputeAccessContext
  items: Record<string, unknown>[]
}

export interface ReviewDisputeArtifactReader {
  listComments(disputeId: string, actorId: string): Promise<ReviewDisputeArtifactSnapshot>
  listEvidences(disputeId: string, actorId: string): Promise<ReviewDisputeArtifactSnapshot>
  listCaseFiles(disputeId: string): Promise<Record<string, unknown>[]>
}
