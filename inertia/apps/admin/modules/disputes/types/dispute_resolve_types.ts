export type DisputeSourceType =
  | 'review_dispute'
  | 'task_review_workflow'
  | 'sprint_review_dispute'
  | 'sprint_reverse_review_workflow'

export interface RuntimeContextEntity {
  id?: string | null
  name?: string | null
  title?: string | null
  username?: string | null
  email?: string | null
  [key: string]: unknown
}

export interface RuntimeContext {
  schema_version?: string | null
  schemaVersion?: string | null
  dispute_review_type?: string | null
  disputeReviewType?: string | null
  organization?: RuntimeContextEntity | null
  project?: RuntimeContextEntity | null
  sprint?: RuntimeContextEntity | null
  task?: RuntimeContextEntity | null
  sprint_peer_tasks?: RuntimeContextEntity[]
  sprintPeerTasks?: RuntimeContextEntity[]
  related_project_tasks?: RuntimeContextEntity[]
  relatedProjectTasks?: RuntimeContextEntity[]
  manager_reviews?: Record<string, unknown>[]
  managerReviews?: Record<string, unknown>[]
  environment_reviews?: Record<string, unknown>[]
  environmentReviews?: Record<string, unknown>[]
  [key: string]: unknown
}

export interface Dispute {
  id: string
  status: string
  created_at: string
  final_decision: string | null
  final_rationale: string | null
  source_type?: DisputeSourceType | string | null
  sourceType?: DisputeSourceType | string | null
  dispute_review_type?: string | null
  disputeReviewType?: string | null
  runtime_context?: RuntimeContext | null
  runtimeContext?: RuntimeContext | null
  organization_id?: string | null
  organizationId?: string | null
  organization_name?: string | null
  organizationName?: string | null
  project_id?: string | null
  projectId?: string | null
  project_name?: string | null
  projectName?: string | null
  sprint_id?: string | null
  sprintId?: string | null
  sprint_name?: string | null
  sprintName?: string | null
  task_id?: string | null
  taskId?: string | null
  task_title?: string | null
  taskTitle?: string | null
}

export interface CaseFile {
  id: string
  case_version: number
  completeness_score: number
  dispute_claim_snapshot?: {
    dispute_reason?: string | null
    requested_outcome?: string | null
    dispute_comments?: Array<{ body?: string | null; author_context?: string | null }>
  }
  task_comments_snapshot?: Array<{
    body?: string | null
    author_id?: string | null
    comment_type?: string | null
    review_relevance?: boolean | null
    created_at?: string | null
  }>
  task_history_snapshot?: Array<{
    field_name?: string | null
    old_value?: string | null
    new_value?: string | null
    changed_at?: string | null
  }>
  evidences_snapshot?: Array<{ title?: string | null; evidence_type?: string | null }>
  skill_reviews_snapshot?: Array<{ skill_id?: string | null; comment?: string | null }>
  missing_data?: string[]
  created_at: string
}

export interface AiEvaluation {
  id: string
  provider: string
  status: string
  recommendation: string | null
  confidence_score?: number | string | null
  summary: string | null
  error_message?: string | null
  profile_approvals?: Array<{
    id: string
    proposal_index: number
    approved_observed_level: string
    approved_at: string
  }>
  profileApprovals?: Array<{
    id: string
    proposalIndex: number
    approvedObservedLevel: string
    approvedAt: string
  }>
  response_payload?: {
    verdict?: Record<string, unknown> | string | null
    debate_trace?: Array<{
      fromRole?: string
      roleId?: string
      summary?: string
      type?: string
      evidence?: string
      audit?: Record<string, unknown>
      presentation?: Record<string, unknown>
    }> | null
  } | null
}

export interface ReadinessSignal {
  label: string
  ready: boolean
  note: string
}

export function getDisputeSourceType(dispute: Dispute): DisputeSourceType {
  const sourceType = dispute.sourceType ?? dispute.source_type
  if (
    sourceType === 'sprint_review_dispute' ||
    sourceType === 'sprint_reverse_review_workflow' ||
    sourceType === 'task_review_workflow' ||
    sourceType === 'review_dispute'
  ) {
    return sourceType
  }

  return 'review_dispute'
}

export function getDisputeReviewType(dispute: Dispute): string {
  return dispute.disputeReviewType ?? dispute.dispute_review_type ?? 'task_review'
}

export function getDisputeRuntimeContext(dispute: Dispute): RuntimeContext {
  return dispute.runtimeContext ?? dispute.runtime_context ?? {}
}

export function getRuntimeContextItems(
  context: RuntimeContext,
  snakeKey: keyof RuntimeContext,
  camelKey: keyof RuntimeContext
): Record<string, unknown>[] {
  const value = context[snakeKey] ?? context[camelKey]
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}
