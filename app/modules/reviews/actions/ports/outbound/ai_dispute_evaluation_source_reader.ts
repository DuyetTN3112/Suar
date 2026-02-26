export interface ReviewDisputeAiSource {
  status: string
  dispute_reason: string
}

export interface ReviewDisputeCaseFileAiSource {
  id: string
  case_version: string | number | null
  missing_data: string | unknown[] | null
  task_snapshot: string | Record<string, unknown> | null
  required_skills_snapshot: string | unknown[] | null
  acceptance_criteria_snapshot: string | Record<string, unknown> | null
  assignment_snapshot: string | Record<string, unknown> | null
  submission_snapshot: string | Record<string, unknown> | null
  review_snapshot: string | Record<string, unknown> | null
  skill_reviews_snapshot: string | unknown[] | null
  evidences_snapshot: string | unknown[] | null
  self_assessment_snapshot: string | Record<string, unknown> | null
  task_comments_snapshot: string | unknown[] | null
  task_history_snapshot: string | unknown[] | null
  dispute_claim_snapshot: string | Record<string, unknown> | null
  reviewer_context_snapshot: string | Record<string, unknown> | null
  reviewee_profile_context_snapshot: string | Record<string, unknown> | null
  completeness_score: string | number | null
}

export interface SprintReviewDisputeAiSource {
  id: string
  status: string
  dispute_reason: string
  dispute_review_type: string | null
  requested_outcome: string | null
  runtime_context: string | Record<string, unknown> | null
}

export interface SprintReverseReviewWorkflowAiSource {
  id: string
  status: string
  comment: string | null
  target_type: 'assigner' | 'environment'
  target_user_id: string | null
  target_entity_id: string | null
  responder_id: string | null
}

export interface ReviewWorkflowReportMessageAiSource {
  body: string
  metadata: string | Record<string, unknown> | null
}

export interface TaskReviewWorkflowAiSource {
  id: string
  status: string
  task_id: string
  project_id: string
  sprint_id: string | null
  organization_id: string
  reviewee_id: string
  reported_by: string | null
  runtime_context: string | Record<string, unknown> | null
}

export interface TaskReviewWorkflowReportMessageAiSource {
  body: string
  metadata: string | Record<string, unknown> | null
}

export interface AiDisputeOperatorProviderMetrics {
  provider: string
  total: number
  active: number
  completed: number
  failed: number
}

export interface AiDisputeOperatorMetrics {
  totalEvaluations: number
  activeEvaluations: number
  completedEvaluations: number
  failedEvaluations: number
  providers: AiDisputeOperatorProviderMetrics[]
}

export type AiDisputeEvaluationSourceKind =
  | 'review_dispute'
  | 'sprint_review_dispute'
  | 'sprint_reverse_review_workflow'
  | 'task_review_workflow'

export interface AiDisputeEvaluationRecordSource extends Record<string, unknown> {
  id: string
  dispute_id: string
  case_file_id: string | null
  source_type?: AiDisputeEvaluationSourceKind | null
  source_id?: string | null
  provider: string
  external_run_id: string | null
  status: string
  request_payload: unknown
  recommendation?: string | null
  confidence_score?: number | string | null
  summary?: string | null
  response_payload?: unknown
  error_message?: string | null
  completed_at?: unknown
}

export interface AiDisputeEvaluationSourceReader {
  loadOperatorMetrics(): Promise<AiDisputeOperatorMetrics>
  listEvaluationRecords(
    sourceType: AiDisputeEvaluationSourceKind,
    sourceId: string
  ): Promise<AiDisputeEvaluationRecordSource[]>
  findActorSystemRole(actorId: string): Promise<string | null>
  findReviewDispute(disputeId: string): Promise<ReviewDisputeAiSource | null>
  findLatestReviewDisputeCaseFile(disputeId: string): Promise<ReviewDisputeCaseFileAiSource | null>
  findSprintReviewDispute(disputeId: string): Promise<SprintReviewDisputeAiSource | null>
  findSprintReverseReviewWorkflow(
    workflowId: string
  ): Promise<SprintReverseReviewWorkflowAiSource | null>
  findSprintReverseReviewReportMessage(
    workflowId: string
  ): Promise<ReviewWorkflowReportMessageAiSource | null>
  findTaskReviewWorkflow(workflowId: string): Promise<TaskReviewWorkflowAiSource | null>
  findTaskReviewReportMessage(
    workflowId: string
  ): Promise<TaskReviewWorkflowReportMessageAiSource | null>
}
