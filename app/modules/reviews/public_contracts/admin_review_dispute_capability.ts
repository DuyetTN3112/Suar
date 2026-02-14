export interface AdminReviewDisputeExecutionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
  readonly requestId?: string | null
  readonly traceId?: string | null
  readonly workflowId?: string | null
}

export interface ListAdminReviewDisputesInput {
  page?: number
  perPage?: number
  after?: string | null
  before?: string | null
  status?: string | null
  search?: string | null
  requestedOutcome?: string | null
  finalDecision?: string | null
}

export interface AdminReviewDisputeListItem {
  id: string
  source_type:
    | 'review_dispute'
    | 'sprint_review_dispute'
    | 'sprint_reverse_review_workflow'
    | 'task_review_workflow'
  dispute_review_type: 'task_review' | 'manager_review' | 'environment_review'
  review_session_id: string | null
  task_assignment_id: string | null
  task_id: string | null
  organization_id: string | null
  project_id: string | null
  sprint_id: string | null
  reviewee_id: string
  opened_by: string
  status: string
  dispute_reason: string
  requested_outcome: string
  final_decision: string | null
  final_rationale: string | null
  created_at: string
  resolved_at: string | null
  task_title: string | null
  reviewee_username: string | null
  review_session_status: string | null
  comments_count: number
  evidences_count: number
  latest_case_version: number | null
  ai_evaluations_count: number
  last_error_message: string | null
}

export interface AdminReviewDisputePage {
  data: AdminReviewDisputeListItem[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    cursor: {
      next_cursor: string | null
      previous_cursor: string | null
      has_next_page: boolean
      has_previous_page: boolean
    }
  }
}

export interface GetAdminReviewDisputeDetailInput {
  disputeId: string
}

export interface AdminReviewDisputeTimelineEntry {
  id: string
  kind: 'audit' | 'comment' | 'evidence' | 'case_file' | 'ai_evaluation'
  action: string
  occurred_at: string
  actor_id: string | null
  actor_label: string | null
  summary: string
  metadata?: Record<string, unknown>
}

export interface AdminReviewDisputeDetail {
  dispute: Record<string, unknown>
  comments: Record<string, unknown>[]
  evidences: Record<string, unknown>[]
  case_files: Record<string, unknown>[]
  ai_evaluations: Record<string, unknown>[]
  timeline: AdminReviewDisputeTimelineEntry[]
}

export interface AdminAiDisputeProviderMetrics {
  provider: string
  total: number
  active: number
  completed: number
  failed: number
}

export interface AdminAiDisputeMetrics {
  totalEvaluations: number
  activeEvaluations: number
  completedEvaluations: number
  failedEvaluations: number
  queuedDisputes: number
  providers: AdminAiDisputeProviderMetrics[]
}

export interface AdminReviewDisputeAiOperatorOverview {
  disputes: AdminReviewDisputePage
  metrics: AdminAiDisputeMetrics
}

export interface AdminReviewDisputeCapability {
  list(
    input: ListAdminReviewDisputesInput,
    context: AdminReviewDisputeExecutionContext
  ): Promise<AdminReviewDisputePage>

  getDetail(
    input: GetAdminReviewDisputeDetailInput,
    context: AdminReviewDisputeExecutionContext
  ): Promise<AdminReviewDisputeDetail>

  getAiOperatorOverview(
    input: ListAdminReviewDisputesInput,
    context: AdminReviewDisputeExecutionContext
  ): Promise<AdminReviewDisputeAiOperatorOverview>
}

export type ListAdminReviewDisputesDTO = ListAdminReviewDisputesInput
export type ListAdminReviewDisputesResult = AdminReviewDisputePage
export type GetAdminReviewDisputeDetailDTO = GetAdminReviewDisputeDetailInput
export type GetAdminReviewDisputeDetailResult = AdminReviewDisputeDetail
export type ReviewAdminDisputeExecutionContext = AdminReviewDisputeExecutionContext
export type ReviewAdminDisputeCapability = AdminReviewDisputeCapability
