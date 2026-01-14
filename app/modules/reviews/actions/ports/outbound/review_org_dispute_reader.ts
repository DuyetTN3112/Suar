export interface ReviewOrgDisputeCursor {
  createdAt: string
  id: string
}

export interface ReviewOrgDisputeReadInput {
  organizationId: string
  status: string | null
  searchTerm: string | null
  revieweeId: string | null
  createdAtStart: string | null
  createdAtEnd: string | null
  after: ReviewOrgDisputeCursor | null
  before: ReviewOrgDisputeCursor | null
  limit: number
}

export interface ReviewOrgDisputeSource {
  id: string
  review_session_id: string
  task_assignment_id: string
  task_id: string
  reviewee_id: string
  opened_by: string
  status: string
  dispute_reason: string
  requested_outcome: string
  final_decision: string | null
  final_rationale: string | null
  created_at: string | Date
  resolved_at: string | null
  task_title: string | null
  reviewee_username: string | null
  review_session_status: string | null
  comments_count: number | string
  evidences_count: number | string
}

export interface ReviewOrgDisputeWindow {
  rows: ReviewOrgDisputeSource[]
  total: number
}

export interface ReviewOrgDisputeReader {
  readWindow(input: ReviewOrgDisputeReadInput): Promise<ReviewOrgDisputeWindow>
}
