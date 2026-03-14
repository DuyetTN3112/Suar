import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { buildAiDisputePayload } from '#modules/reviews/domain/ai_dispute_payload_builder'
import { canStartAiDisputeEvaluation } from '#modules/reviews/domain/ai_dispute_rules'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'

export interface StartAiDisputeEvaluationDTO {
  dispute_id: string
  provider: string
  source_type?: AiDisputeSourceType
}

export type AiDisputeSourceType =
  | 'review_dispute'
  | 'sprint_review_dispute'
  | 'sprint_reverse_review_workflow'
  | 'task_review_workflow'

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
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) throw new UnauthorizedException()
  return ctx.userId
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>
  return (value ?? {}) as Record<string, unknown>
}

function parseJsonArray(value: unknown): Record<string, unknown>[] {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>[]
  return (value ?? []) as Record<string, unknown>[]
}

function parseOptionalJsonObject(value: string): Record<string, unknown> {
  if (!value.trim()) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function externalRunIdFromClawagentAccepted(payload: Record<string, unknown>): string | null {
  return (
    optionalString(payload['evaluation_id']) ??
    optionalString(payload['external_run_id']) ??
    optionalString(payload['externalRunId']) ??
    optionalString(payload['run_id']) ??
    optionalString(payload['runId']) ??
    optionalString(payload['id'])
  )
}

function normalizeSourceType(value: unknown): AiDisputeSourceType {
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

function normalize(row: Record<string, unknown>): AiDisputeEvaluationResult {
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

function toIsoLike(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date(0).toISOString()
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

interface SprintReviewDisputeRow {
  id: string
  status: string
  dispute_reason: string
  dispute_review_type: string | null
  requested_outcome: string | null
  runtime_context: string | Record<string, unknown> | null
}

function buildSprintReviewDisputePayload(dispute: SprintReviewDisputeRow): Record<string, unknown> {
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

interface SprintReverseReviewWorkflowRow {
  id: string
  status: string
  comment: string | null
  target_type: 'assigner' | 'environment'
  target_user_id: string | null
  target_entity_id: string | null
  responder_id: string | null
}

interface SprintReverseReviewReportMessageRow {
  body: string
  metadata: string | Record<string, unknown> | null
}

function buildSprintReverseReviewWorkflowPayload(
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

interface TaskReviewWorkflowRow {
  id: string
  task_id: string
  project_id: string
  organization_id: string
  reviewee_id: string | null
  status: string
  reported_by: string | null
  runtime_context: string | Record<string, unknown> | null
}

interface TaskReviewWorkflowReportMessageRow {
  body: string
  metadata: string | Record<string, unknown> | null
}

function buildTaskReviewWorkflowPayload(
  workflow: TaskReviewWorkflowRow,
  reportMessage: TaskReviewWorkflowReportMessageRow | undefined
): Record<string, unknown> {
  const workflowRuntimeContext = parseJsonObject(workflow.runtime_context)
  const reportMetadata = parseJsonObject(reportMessage?.metadata)
  const messageRuntimeContext = parseJsonObject(reportMetadata['runtime_context'])
  const runtimeContext =
    Object.keys(workflowRuntimeContext).length > 0
      ? workflowRuntimeContext
      : messageRuntimeContext

  return {
    ...runtimeContext,
    schema_version: 'suar_ai_dispute_package_v1',
    review_dispute_id: workflow.id,
    case_file_id: null,
    source_type: 'task_review_workflow',
    source_id: workflow.id,
    dispute_review_type: 'task_review',
    workflow: {
      id: workflow.id,
      status: workflow.status,
      task_id: workflow.task_id,
      project_id: workflow.project_id,
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

export default class StartAiDisputeEvaluationCommand {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: StartAiDisputeEvaluationDTO): Promise<AiDisputeEvaluationResult> {
    const actorId = requireUserId(this.execCtx)
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildReviewDisputeEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_AI_EVALUATION_STARTED,
        eventFamily: 'dispute',
        subsystem: 'ai_dispute_evaluation',
        workflow: 'review_dispute_ai_evaluation',
        stage: 'started',
        outcome: 'success',
        disputeId: dto.dispute_id,
        change: {
          provider: dto.provider,
        },
        retentionClass: 'transient_runtime',
      })
    )
    const actor = (await db.from('users').where('id', actorId).select('system_role').first()) as
      | { system_role: string }
      | undefined
    if (!actor) throw new NotFoundException('User not found')

    if (dto.source_type === 'sprint_review_dispute') {
      return this.executeSprintReviewDisputeEvaluation(dto, actor.system_role, startedAt)
    }

    if (dto.source_type === 'sprint_reverse_review_workflow') {
      return this.executeSprintReverseReviewWorkflowEvaluation(dto, actor.system_role, startedAt)
    }

    if (dto.source_type === 'task_review_workflow') {
      return this.executeTaskReviewWorkflowEvaluation(dto, actor.system_role, startedAt)
    }

    const dispute = (await db.from('review_disputes').where('id', dto.dispute_id).first()) as
      | { status: string; dispute_reason: string }
      | undefined
    if (!dispute) {
      return this.executeSprintReviewDisputeEvaluation(dto, actor.system_role, startedAt)
    }

    const caseFile = (await db
      .from('review_dispute_case_files')
      .where('dispute_id', dto.dispute_id)
      .orderBy('case_version', 'desc')
      .first()) as
      | {
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
      | undefined

    if (!caseFile) {
      throw new NotFoundException('Review dispute case file not found')
    }

    const missingData = parseJsonArray(caseFile.missing_data)
    const missingCriticalData = ['task', 'assignment', 'review'].some((key) =>
      missingData.some((item) => item['key'] === key)
    )
    const policyResult = canStartAiDisputeEvaluation({
      actorSystemRole: actor.system_role,
      disputeStatus: dispute.status,
      hasCaseFile: true,
      missingCriticalData,
    })

    if (!policyResult.allowed) {
      if (policyResult.code === 'FORBIDDEN') throw new ForbiddenException(policyResult.reason)
      throw new BusinessLogicException(policyResult.reason)
    }

    const payload = buildAiDisputePayload({
      id: caseFile.id,
      dispute_id: dto.dispute_id,
      case_version: caseFile.case_version,
      task_snapshot: parseJsonObject(caseFile.task_snapshot),
      required_skills_snapshot: parseJsonArray(caseFile.required_skills_snapshot),
      acceptance_criteria_snapshot: parseJsonObject(caseFile.acceptance_criteria_snapshot),
      assignment_snapshot: parseJsonObject(caseFile.assignment_snapshot),
      submission_snapshot: parseJsonObject(caseFile.submission_snapshot),
      review_snapshot: parseJsonObject(caseFile.review_snapshot),
      skill_reviews_snapshot: parseJsonArray(caseFile.skill_reviews_snapshot),
      evidences_snapshot: parseJsonArray(caseFile.evidences_snapshot),
      self_assessment_snapshot: parseJsonObject(caseFile.self_assessment_snapshot),
      task_comments_snapshot: parseJsonArray(caseFile.task_comments_snapshot),
      task_history_snapshot: parseJsonArray(caseFile.task_history_snapshot),
      dispute_claim_snapshot: parseJsonObject(caseFile.dispute_claim_snapshot),
      reviewer_context_snapshot: parseJsonObject(caseFile.reviewer_context_snapshot),
      reviewee_profile_context_snapshot: parseJsonObject(
        caseFile.reviewee_profile_context_snapshot
      ),
      completeness_score: Number(caseFile.completeness_score ?? 0),
      missing_data: missingData,
    })

    const [created] = (await db
      .table('ai_dispute_evaluations')
      .insert({
        dispute_id: dto.dispute_id,
        case_file_id: caseFile.id,
        source_type: 'review_dispute',
        source_id: dto.dispute_id,
        provider: dto.provider,
        status: 'queued',
        request_payload: JSON.stringify(payload),
      })
      .returning('*')) as [Record<string, unknown>]

    if (process.env['NODE_ENV'] !== 'test' && process.env['NODE_ENV'] !== 'testing') {
      const appUrl = (process.env['APP_URL'] ?? 'http://localhost:3333').replace(/\/+$/, '')
      const clawagentUrl =
        process.env['CLAWAGENT_API_URL'] ?? 'http://localhost:8080/api/public/disputes/arbitrate'
      const callbackUrl =
        process.env['SUAR_CALLBACK_URL'] ?? `${appUrl}/api/public/ai-disputes/callback`
      const clawagentSecret =
        process.env['SUAR_DISPUTE_API_KEY'] ?? process.env['DEVPORTAL_API_KEY_SECRET']

      const reviewSnapshot = parseJsonObject(caseFile.review_snapshot)
      const claimantArg = dispute.dispute_reason
      const respondentArg =
        (reviewSnapshot['overall_feedback'] as string) || 'No specific response argument provided.'

      const triggerPayload = buildClawagentDisputeTriggerPayload({
        evaluationId: created['id'] as string,
        reviewDisputeId: dto.dispute_id,
        caseFileId: caseFile.id,
        title: `Dispute for case file ${caseFile.id}`,
        claimantArgument: claimantArg,
        respondentArgument: respondentArg,
        requestPayload: payload,
        callbackUrl,
      })

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (clawagentSecret) {
          headers['X-API-Key'] = clawagentSecret
        }

        const response = await fetch(clawagentUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(triggerPayload),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Clawagent returned HTTP ${response.status}: ${errText}`)
        }

        const acceptedPayload = parseOptionalJsonObject(await response.text())
        const externalRunId = externalRunIdFromClawagentAccepted(acceptedPayload)
        const evaluationUpdate: Record<string, unknown> = { status: 'processing' }
        if (externalRunId) {
          evaluationUpdate['external_run_id'] = externalRunId
        }

        // Trigger was successful, update status in DB to processing
        await db
          .from('ai_dispute_evaluations')
          .where('id', created['id'] as string)
          .update(evaluationUpdate)
        await db
          .from('review_disputes')
          .where('id', dto.dispute_id)
          .update({
            status: 'ai_reviewing',
            updated_at: db.raw('NOW()'),
          })

        created['status'] = 'processing'
        if (externalRunId) {
          created['external_run_id'] = externalRunId
        }
      } catch (error) {
        // If trigger failed, update DB to failed
        await db
          .from('ai_dispute_evaluations')
          .where('id', created['id'] as string)
          .update({
            status: 'failed',
            error_message: `Failed to trigger clawagent: ${(error as Error).message}`,
            completed_at: db.raw('NOW()'),
          })

        created['status'] = 'failed'
        created['error_message'] = `Failed to trigger clawagent: ${(error as Error).message}`
      }
    }

    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'queue_ai_dispute_evaluation',
        entity_type: 'review_dispute',
        entity_id: dto.dispute_id,
        old_values: null,
        new_values: {
          ai_evaluation_id: created['id'],
          case_file_id: caseFile.id,
          provider: dto.provider,
          status: created['status'],
        },
      })
    }

    await platformWorkflowLogger.checkpointSafely(
      this.execCtx,
      buildReviewDisputeEvent(this.execCtx, {
        eventName:
          created['status'] === 'failed'
            ? PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_AI_EVALUATION_FAILED
            : PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_AI_EVALUATION_COMPLETED,
        eventFamily: 'dispute',
        subsystem: 'ai_dispute_evaluation',
        workflow: 'review_dispute_ai_evaluation',
        stage: created['status'] === 'failed' ? 'failed' : 'completed',
        outcome: created['status'] === 'failed' ? 'failure' : 'success',
        disputeId: dto.dispute_id,
        change: {
          ai_evaluation_id: created['id'],
          case_file_id: caseFile.id,
          provider: dto.provider,
          status: created['status'],
        },
        runtime: {
          duration_ms: Date.now() - startedAt,
        },
        error:
          created['status'] === 'failed' && typeof created['error_message'] === 'string'
            ? created['error_message']
            : undefined,
      })
    )

    return normalize(created)
  }

  private assertCanStartSprintReverseWorkflowEvaluation(
    actorSystemRole: string,
    workflowStatus: string,
    hasRuntimeContext: boolean
  ): void {
    if (actorSystemRole !== 'system_admin' && actorSystemRole !== 'superadmin') {
      throw new ForbiddenException('Only system admin can start AI dispute evaluation')
    }

    if (workflowStatus !== 'reported') {
      throw new BusinessLogicException(
        'Only reported sprint reverse reviews can start AI evaluation'
      )
    }

    if (!hasRuntimeContext) {
      throw new BusinessLogicException(
        'AI dispute evaluation requires reverse review runtime context'
      )
    }
  }

  private async executeSprintReverseReviewWorkflowEvaluation(
    dto: StartAiDisputeEvaluationDTO,
    actorSystemRole: string,
    startedAt: number
  ): Promise<AiDisputeEvaluationResult> {
    const workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', dto.dispute_id)
      .first()) as SprintReverseReviewWorkflowRow | undefined
    if (!workflow) throw new NotFoundException('Review dispute not found')

    const reportMessage = (await db
      .from('sprint_reverse_review_messages')
      .where('workflow_id', workflow.id)
      .where('message_type', 'report')
      .orderBy('created_at', 'desc')
      .first()) as SprintReverseReviewReportMessageRow | undefined
    if (!reportMessage) {
      throw new NotFoundException('Sprint reverse review report not found')
    }

    const reportMetadata = parseJsonObject(reportMessage.metadata)
    const runtimeContext = parseJsonObject(reportMetadata['runtime_context'])
    this.assertCanStartSprintReverseWorkflowEvaluation(
      actorSystemRole,
      workflow.status,
      Object.keys(runtimeContext).length > 0
    )

    const payload = buildSprintReverseReviewWorkflowPayload(workflow, reportMessage)
    const [created] = (await db
      .table('ai_dispute_evaluations')
      .insert({
        dispute_id: workflow.id,
        case_file_id: null,
        source_type: 'sprint_reverse_review_workflow',
        source_id: workflow.id,
        provider: dto.provider,
        status: 'queued',
        request_payload: JSON.stringify(payload),
      })
      .returning('*')) as [Record<string, unknown>]

    if (process.env['NODE_ENV'] !== 'test' && process.env['NODE_ENV'] !== 'testing') {
      const appUrl = (process.env['APP_URL'] ?? 'http://localhost:3333').replace(/\/+$/, '')
      const clawagentUrl =
        process.env['CLAWAGENT_API_URL'] ?? 'http://localhost:8080/api/public/disputes/arbitrate'
      const callbackUrl =
        process.env['SUAR_CALLBACK_URL'] ?? `${appUrl}/api/public/ai-disputes/callback`
      const clawagentSecret =
        process.env['SUAR_DISPUTE_API_KEY'] ?? process.env['DEVPORTAL_API_KEY_SECRET']
      const triggerPayload = buildClawagentDisputeTriggerPayload({
        evaluationId: created['id'] as string,
        reviewDisputeId: workflow.id,
        caseFileId: null,
        sourceType: 'sprint_reverse_review_workflow',
        sourceId: workflow.id,
        title: `Sprint reverse review workflow ${workflow.id}`,
        claimantArgument:
          reportMessage.body || workflow.comment || 'Sprint reverse review dispute.',
        respondentArgument: 'Sprint reverse review runtime context is provided in context.',
        requestPayload: payload,
        callbackUrl,
      })

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (clawagentSecret) {
          headers['X-API-Key'] = clawagentSecret
        }

        const response = await fetch(clawagentUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(triggerPayload),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Clawagent returned HTTP ${response.status}: ${errText}`)
        }

        const acceptedPayload = parseOptionalJsonObject(await response.text())
        const externalRunId = externalRunIdFromClawagentAccepted(acceptedPayload)
        const evaluationUpdate: Record<string, unknown> = { status: 'processing' }
        if (externalRunId) {
          evaluationUpdate['external_run_id'] = externalRunId
        }

        await db
          .from('ai_dispute_evaluations')
          .where('id', created['id'] as string)
          .update(evaluationUpdate)
        await db
          .from('sprint_reverse_review_workflows')
          .where('id', workflow.id)
          .update({
            status: 'ai_reviewing',
            updated_at: db.raw('NOW()'),
          })

        created['status'] = 'processing'
        if (externalRunId) {
          created['external_run_id'] = externalRunId
        }
      } catch (error) {
        await db
          .from('ai_dispute_evaluations')
          .where('id', created['id'] as string)
          .update({
            status: 'failed',
            error_message: `Failed to trigger clawagent: ${(error as Error).message}`,
            completed_at: db.raw('NOW()'),
          })

        created['status'] = 'failed'
        created['error_message'] = `Failed to trigger clawagent: ${(error as Error).message}`
      }
    }

    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'queue_ai_dispute_evaluation',
        entity_type: 'sprint_reverse_review_workflow',
        entity_id: workflow.id,
        old_values: null,
        new_values: {
          ai_evaluation_id: created['id'],
          case_file_id: null,
          source_type: 'sprint_reverse_review_workflow',
          source_id: workflow.id,
          provider: dto.provider,
          status: created['status'],
        },
      })
    }

    await platformWorkflowLogger.checkpointSafely(
      this.execCtx,
      buildReviewDisputeEvent(this.execCtx, {
        eventName:
          created['status'] === 'failed'
            ? PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_AI_EVALUATION_FAILED
            : PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_AI_EVALUATION_COMPLETED,
        eventFamily: 'dispute',
        subsystem: 'ai_dispute_evaluation',
        workflow: 'review_dispute_ai_evaluation',
        stage: created['status'] === 'failed' ? 'failed' : 'completed',
        outcome: created['status'] === 'failed' ? 'failure' : 'success',
        disputeId: workflow.id,
        change: {
          ai_evaluation_id: created['id'],
          case_file_id: null,
          source_type: 'sprint_reverse_review_workflow',
          provider: dto.provider,
          status: created['status'],
        },
        runtime: {
          duration_ms: Date.now() - startedAt,
        },
        error:
          created['status'] === 'failed' && typeof created['error_message'] === 'string'
            ? created['error_message']
            : undefined,
      })
    )

    return normalize(created)
  }

  private async executeSprintReviewDisputeEvaluation(
    dto: StartAiDisputeEvaluationDTO,
    actorSystemRole: string,
    startedAt: number
  ): Promise<AiDisputeEvaluationResult> {
    const dispute = (await db
      .from('sprint_review_disputes')
      .where('id', dto.dispute_id)
      .first()) as SprintReviewDisputeRow | undefined
    if (!dispute) throw new NotFoundException('Review dispute not found')

    const runtimeContext = parseJsonObject(dispute.runtime_context)
    const policyResult = canStartAiDisputeEvaluation({
      actorSystemRole,
      disputeStatus: dispute.status,
      hasCaseFile: Object.keys(runtimeContext).length > 0,
      missingCriticalData: false,
    })

    if (!policyResult.allowed) {
      if (policyResult.code === 'FORBIDDEN') throw new ForbiddenException(policyResult.reason)
      throw new BusinessLogicException(policyResult.reason)
    }

    const payload = buildSprintReviewDisputePayload(dispute)
    const [created] = (await db
      .table('ai_dispute_evaluations')
      .insert({
        dispute_id: dispute.id,
        case_file_id: null,
        source_type: 'sprint_review_dispute',
        source_id: dispute.id,
        provider: dto.provider,
        status: 'queued',
        request_payload: JSON.stringify(payload),
      })
      .returning('*')) as [Record<string, unknown>]

    if (process.env['NODE_ENV'] !== 'test' && process.env['NODE_ENV'] !== 'testing') {
      const appUrl = (process.env['APP_URL'] ?? 'http://localhost:3333').replace(/\/+$/, '')
      const clawagentUrl =
        process.env['CLAWAGENT_API_URL'] ?? 'http://localhost:8080/api/public/disputes/arbitrate'
      const callbackUrl =
        process.env['SUAR_CALLBACK_URL'] ?? `${appUrl}/api/public/ai-disputes/callback`
      const clawagentSecret =
        process.env['SUAR_DISPUTE_API_KEY'] ?? process.env['DEVPORTAL_API_KEY_SECRET']
      const triggerPayload = buildClawagentDisputeTriggerPayload({
        evaluationId: created['id'] as string,
        reviewDisputeId: dispute.id,
        caseFileId: null,
        sourceType: 'sprint_review_dispute',
        sourceId: dispute.id,
        title: `Sprint review dispute ${dispute.id}`,
        claimantArgument: dispute.dispute_reason,
        respondentArgument: 'Sprint review runtime context is provided in context.',
        requestPayload: payload,
        callbackUrl,
      })

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (clawagentSecret) {
          headers['X-API-Key'] = clawagentSecret
        }

        const response = await fetch(clawagentUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(triggerPayload),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Clawagent returned HTTP ${response.status}: ${errText}`)
        }

        const acceptedPayload = parseOptionalJsonObject(await response.text())
        const externalRunId = externalRunIdFromClawagentAccepted(acceptedPayload)
        const evaluationUpdate: Record<string, unknown> = { status: 'processing' }
        if (externalRunId) {
          evaluationUpdate['external_run_id'] = externalRunId
        }

        await db
          .from('ai_dispute_evaluations')
          .where('id', created['id'] as string)
          .update(evaluationUpdate)
        await db
          .from('sprint_review_disputes')
          .where('id', dispute.id)
          .update({
            status: 'ai_reviewing',
            updated_at: db.raw('NOW()'),
          })

        created['status'] = 'processing'
        if (externalRunId) {
          created['external_run_id'] = externalRunId
        }
      } catch (error) {
        await db
          .from('ai_dispute_evaluations')
          .where('id', created['id'] as string)
          .update({
            status: 'failed',
            error_message: `Failed to trigger clawagent: ${(error as Error).message}`,
            completed_at: db.raw('NOW()'),
          })

        created['status'] = 'failed'
