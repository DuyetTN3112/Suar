import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { buildAiDisputePayload } from '#modules/disputes/domain/ai_dispute_payload_builder'
import type { AiDisputeSourceType } from '#modules/disputes/public_contracts/ai_dispute_auto_queue'

export type AiDisputeRequestPayload =
  | ReturnType<typeof buildAiDisputePayload>
  | Record<string, unknown>

export interface AiDisputeEvaluationResult {
  id: string
  dispute_id: string
  case_file_id: string | null
  source_type: AiDisputeSourceType
  source_id: string | null
  provider: string
  external_run_id: string | null
  status: string
  created_at: string
  request_payload: AiDisputeRequestPayload
  recommendation?: string | null
  confidence_score?: number | string | null
  summary?: string | null
  response_payload?: Record<string, unknown>
  error_message?: string | null
  completed_at?: string | null
  profile_approvals?: Array<{
    id: string
    proposal_index: number
    approved_observed_level: string
    approved_at: string
  }>
}

export function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) throw new UnauthorizedException()
  return ctx.userId
}

export function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>
  return (value ?? {}) as Record<string, unknown>
}

export function parseJsonArray(value: unknown): Record<string, unknown>[] {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>[]
  return (value ?? []) as Record<string, unknown>[]
}

export function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function scopedEntity(value: unknown, id: string | null): Record<string, unknown> {
  const entity = { ...parseJsonObject(value) }
  if (id) entity['id'] = id
  return entity
}

export function normalizeSourceType(value: unknown): AiDisputeSourceType {
  if (
    value === 'sprint_review_dispute' ||
    value === 'sprint_reverse_review_workflow' ||
    value === 'task_review_workflow' ||
    value === 'review_dispute'
  ) {
    return value
  }
  return 'review_dispute'
}

export function toIsoLike(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date(0).toISOString()
}

export function normalize(row: Record<string, unknown>): AiDisputeEvaluationResult {
  return {
    id: row['id'] as string,
    dispute_id: row['dispute_id'] as string,
    case_file_id: (row['case_file_id'] as string | null) ?? null,
    source_type: normalizeSourceType(row['source_type']),
    source_id: (row['source_id'] as string | null) ?? ((row['dispute_id'] as string) || null),
    provider: row['provider'] as string,
    external_run_id: (row['external_run_id'] as string | null) ?? null,
    status: row['status'] as string,
    created_at: toIsoLike(row['created_at']),
    request_payload:
      typeof row['request_payload'] === 'string'
        ? (JSON.parse(row['request_payload']) as AiDisputeRequestPayload)
        : (row['request_payload'] as AiDisputeRequestPayload),
  }
}

export interface ClawagentDisputeTriggerPayloadInput {
  evaluationId: string
  reviewDisputeId: string
  caseFileId: string | null
  sourceType?: AiDisputeSourceType
  sourceId?: string | null
  title: string
  claimantArgument: string
  respondentArgument: string
  requestPayload: AiDisputeRequestPayload
  callbackUrl: string
}

export function buildClawagentDisputeTriggerPayload(input: ClawagentDisputeTriggerPayloadInput) {
  return {
    schema_version: 'suar_clawagent_dispute_trigger_v1',
    disputeId: input.evaluationId,
    evaluation_id: input.evaluationId,
    review_dispute_id: input.reviewDisputeId,
    case_file_id: input.caseFileId,
    source_type: input.sourceType ?? 'review_dispute',
    source_id: input.sourceId ?? input.reviewDisputeId,
    title: input.title,
    claimant: {
      role: 'Reviewee',
      argument: input.claimantArgument,
    },
    respondent: {
      role: 'Reviewer',
      argument: input.respondentArgument,
    },
    context: input.requestPayload,
    callbackUrl: input.callbackUrl,
  }
}

export interface SprintReviewDisputeRow {
  id: string
  status: string
  dispute_reason: string
  dispute_review_type: string | null
  requested_outcome: string | null
  runtime_context: string | Record<string, unknown> | null
}

export function buildSprintReviewDisputePayload(dispute: SprintReviewDisputeRow): Record<string, unknown> {
  const runtimeContext = parseJsonObject(dispute.runtime_context)
  const disputeReviewType =
    optionalString(runtimeContext['dispute_review_type']) ??
    optionalString(dispute.dispute_review_type) ??
    'manager_review'

  return {
    ...runtimeContext,
    schema_version: 'suar_ai_dispute_package_v1',
    review_dispute_id: dispute.id,
    case_file_id: null,
    source_type: 'sprint_review_dispute',
    source_id: dispute.id,
    dispute_review_type: disputeReviewType,
    dispute_claim: {
      dispute_reason: dispute.dispute_reason,
      requested_outcome: dispute.requested_outcome,
    },
    provenance: {
      primary_table: 'sprint_review_disputes',
      primary_id: dispute.id,
      related_tables: [
        'sprint_review_packages',
        'sprint_manager_reviews',
        'sprint_environment_reviews',
        'tasks',
        'users',
      ],
    },
  }
}

export interface SprintReverseReviewWorkflowRow {
  id: string
  status: string
  comment: string | null
  target_type: 'assigner' | 'environment'
  target_user_id: string | null
  target_entity_id: string | null
  responder_id: string | null
}

export interface SprintReverseReviewReportMessageRow {
  body: string
  metadata: string | Record<string, unknown> | null
}

export function buildSprintReverseReviewWorkflowPayload(
  workflow: SprintReverseReviewWorkflowRow,
  reportMessage: SprintReverseReviewReportMessageRow
): Record<string, unknown> {
  const metadata = parseJsonObject(reportMessage.metadata)
  const runtimeContext = parseJsonObject(metadata['runtime_context'])
  const disputeReviewType =
    optionalString(runtimeContext['dispute_review_type']) ??
    (workflow.target_type === 'environment' ? 'environment_review' : 'manager_review')

  return {
    ...runtimeContext,
    schema_version: 'suar_ai_dispute_package_v1',
    review_dispute_id: workflow.id,
    case_file_id: null,
    source_type: 'sprint_reverse_review_workflow',
    source_id: workflow.id,
    dispute_review_type: disputeReviewType,
    workflow: {
      id: workflow.id,
      status: workflow.status,
      target_type: workflow.target_type,
      target_user_id: workflow.target_user_id,
      target_entity_id: workflow.target_entity_id,
      responder_id: workflow.responder_id,
    },
    dispute_claim: {
      dispute_reason: reportMessage.body || workflow.comment,
      requested_outcome: 'request_admin_review',
    },
    provenance: {
      primary_table: 'sprint_reverse_review_workflows',
      primary_id: workflow.id,
      related_tables: [
        'sprint_reverse_review_messages',
        'project_sprints',
        'tasks',
        'task_assignments',
        'users',
      ],
    },
  }
}

export interface TaskReviewWorkflowRow {
  id: string
  task_id: string
  project_id: string
  sprint_id: string | null
  organization_id: string
  reviewee_id: string | null
  status: string
  reported_by: string | null
  runtime_context: string | Record<string, unknown> | null
}

export interface TaskReviewWorkflowReportMessageRow {
  body: string
  metadata: string | Record<string, unknown> | null
}

export function buildTaskReviewWorkflowPayload(
  workflow: TaskReviewWorkflowRow,
  reportMessage: TaskReviewWorkflowReportMessageRow | undefined
): Record<string, unknown> {
  const workflowRuntimeContext = parseJsonObject(workflow.runtime_context)
  const reportMetadata = parseJsonObject(reportMessage?.metadata)
  const messageRuntimeContext = parseJsonObject(reportMetadata['runtime_context'])
  const runtimeContext =
    Object.keys(workflowRuntimeContext).length > 0 ? workflowRuntimeContext : messageRuntimeContext

  return {
    ...runtimeContext,
    schema_version: 'suar_ai_dispute_package_v2',
    review_dispute_id: workflow.id,
    case_file_id: null,
    source_type: 'task_review_workflow',
    source_id: workflow.id,
    dispute_review_type: 'task_review',
    organization: scopedEntity(runtimeContext['organization'], workflow.organization_id),
    project: scopedEntity(runtimeContext['project'], workflow.project_id),
    sprint: scopedEntity(runtimeContext['sprint'], workflow.sprint_id),
    task: scopedEntity(runtimeContext['task'], workflow.task_id),
    workflow: {
      id: workflow.id,
      status: workflow.status,
      task_id: workflow.task_id,
      project_id: workflow.project_id,
      sprint_id: workflow.sprint_id,
      organization_id: workflow.organization_id,
      reviewee_id: workflow.reviewee_id,
      reported_by: workflow.reported_by,
    },
    dispute_claim: {
      dispute_reason: reportMessage?.body ?? 'Task review workflow reported to admin.',
      requested_outcome: 'request_admin_review',
    },
    provenance: {
      primary_table: 'task_review_workflows',
      primary_id: workflow.id,
      related_tables: [
        'task_review_messages',
        'task_review_reviewers',
        'tasks',
        'task_assignments',
        'project_sprints',
        'users',
      ],
    },
  }
}
