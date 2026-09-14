export type ReviewAdminDisputeSourceType =
  | 'review_dispute'
  | 'sprint_review_dispute'
  | 'sprint_reverse_review_workflow'
  | 'task_review_workflow'

export interface ReviewAdminDisputeCursor {
  createdAt: string
  id: string
}

export interface ReviewAdminDisputeListReadInput {
  filters: {
    status?: string | null | undefined
    search?: string | null | undefined
    requestedOutcome?: string | null | undefined
    finalDecision?: string | null | undefined
  }
  after: ReviewAdminDisputeCursor | null
  before: ReviewAdminDisputeCursor | null
  limit: number
}

export interface ReviewAdminDisputeListSnapshot {
  rows: Record<string, unknown>[]
  total: number
}

export interface ReviewAdminDisputeDetailSnapshot {
  sourceType: ReviewAdminDisputeSourceType
  dispute: Record<string, unknown>
  comments: Record<string, unknown>[]
  auditEvents: Record<string, unknown>[]
}

export interface ReviewAdminDisputeReadModel {
  findActorSystemRole(actorId: string): Promise<string | null | undefined>
  listDisputes(input: ReviewAdminDisputeListReadInput): Promise<ReviewAdminDisputeListSnapshot>
  findDisputeDetail(disputeId: string): Promise<ReviewAdminDisputeDetailSnapshot | null>
}
