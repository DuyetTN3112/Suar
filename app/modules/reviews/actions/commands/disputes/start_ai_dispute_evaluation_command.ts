import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type {
  AiDisputeEvaluationGateway,
  AiDisputeSourceTable,
} from '#modules/reviews/actions/ports/outbound/ai_dispute_evaluation_gateway'
import type { AiDisputeEvaluationSourceReader } from '#modules/reviews/actions/ports/outbound/ai_dispute_evaluation_source_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { buildAiDisputePayload } from '#modules/reviews/domain/disputes/ai_dispute_payload_builder'
import { canStartAiDisputeEvaluation } from '#modules/reviews/domain/disputes/ai_dispute_rules'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'
import type { AiDisputeSourceType } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

export type { AiDisputeSourceType } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

export interface StartAiDisputeEvaluationDTO {
  dispute_id: string
  provider: string
  source_type?: AiDisputeSourceType
}

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

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function scopedEntity(value: unknown, id: string | null): Record<string, unknown> {
  const entity = { ...parseJsonObject(value) }
  if (id) entity['id'] = id
  return entity
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

interface StageAndTriggerAiDisputeEvaluationInput {
  disputeId: string
  caseFileId: string | null
  sourceType: AiDisputeSourceType
  sourceId: string
  sourceTable: AiDisputeSourceTable
  expectedSourceStatus: string
  provider: string
  requestPayload: AiDisputeRequestPayload
  buildTriggerPayload: (evaluationId: string, callbackUrl: string) => Record<string, unknown>
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
  sprint_id: string | null
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

export default class StartAiDisputeEvaluationCommand extends BaseCommand<
  StartAiDisputeEvaluationDTO,
  AiDisputeEvaluationResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly aiDisputeGateway: AiDisputeEvaluationGateway,
    private readonly runtime: {
      callbackUrl: string
      dispatchImmediately: boolean
    },
    private readonly sources: AiDisputeEvaluationSourceReader
  ) {
    super(execCtx)
  }

  private async stageAndTriggerEvaluation(
    input: StageAndTriggerAiDisputeEvaluationInput
  ): Promise<Record<string, unknown>> {
    const { created, triggerPayload } = await this.aiDisputeGateway.stage({
      disputeId: input.disputeId,
      caseFileId: input.caseFileId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceTable: input.sourceTable,
      expectedSourceStatus: input.expectedSourceStatus,
      provider: input.provider,
      requestPayload: input.requestPayload,
      buildTriggerPayload: (evaluationId) =>
        input.buildTriggerPayload(evaluationId, this.runtime.callbackUrl),
      beforeCommit: async (trx, stagedEvaluation) => {
        if (!this.execCtx.userId) {
          return
        }
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'queue_ai_dispute_evaluation',
            entity_type: input.sourceType,
            entity_id: input.sourceId,
            old_values: null,
            new_values: {
              ai_evaluation_id: stagedEvaluation['id'],
              case_file_id: input.caseFileId,
              source_type: input.sourceType,
              source_id: input.sourceId,
              provider: input.provider,
              status: stagedEvaluation['status'],
            },
            critical: true,
          },
          trx as never
        )
      },
    })

    if (!this.runtime.dispatchImmediately) {
      return created
    }

    const dispatchResult = await this.aiDisputeGateway.dispatch({
      evaluationId: created['id'] as string,
      sourceTable: input.sourceTable,
      sourceId: input.sourceId,
      expectedSourceStatus: input.expectedSourceStatus,
      triggerPayload,
    })
    created['status'] = dispatchResult.status
    created['external_run_id'] = dispatchResult.externalRunId
    created['error_message'] = dispatchResult.errorMessage
    created['trigger_error_retryable'] = dispatchResult.retryable
    return created
  }

  async execute(dto: StartAiDisputeEvaluationDTO): Promise<AiDisputeEvaluationResult> {
    return this.handle(dto)
  }

  async handle(dto: StartAiDisputeEvaluationDTO): Promise<AiDisputeEvaluationResult> {
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
    const actorSystemRole = await this.sources.findActorSystemRole(actorId)
    if (!actorSystemRole) throw new NotFoundException('User not found')

    if (dto.source_type === 'sprint_review_dispute') {
      return this.executeSprintReviewDisputeEvaluation(dto, actorSystemRole, startedAt)
    }

    if (dto.source_type === 'sprint_reverse_review_workflow') {
      return this.executeSprintReverseReviewWorkflowEvaluation(dto, actorSystemRole, startedAt)
    }

    if (dto.source_type === 'task_review_workflow') {
      return this.executeTaskReviewWorkflowEvaluation(dto, actorSystemRole, startedAt)
    }

    const dispute = await this.sources.findReviewDispute(dto.dispute_id)
    if (!dispute) {
      return this.executeSprintReviewDisputeEvaluation(dto, actorSystemRole, startedAt)
    }

    const caseFile = await this.sources.findLatestReviewDisputeCaseFile(dto.dispute_id)

    if (!caseFile) {
      throw new NotFoundException('Review dispute case file not found')
    }

    const missingData = parseJsonArray(caseFile.missing_data)
    const missingCriticalData = ['task', 'assignment', 'review'].some((key) =>
      missingData.some((item) => item['key'] === key)
    )
    const policyResult = canStartAiDisputeEvaluation({
      actorSystemRole,
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

    const reviewSnapshot = parseJsonObject(caseFile.review_snapshot)
    const respondentArgument =
      (reviewSnapshot['overall_feedback'] as string) || 'No specific response argument provided.'
    const created = await this.stageAndTriggerEvaluation({
      disputeId: dto.dispute_id,
      caseFileId: caseFile.id,
      sourceType: 'review_dispute',
      sourceId: dto.dispute_id,
      sourceTable: 'review_disputes',
      expectedSourceStatus: dispute.status,
      provider: dto.provider,
      requestPayload: payload,
      buildTriggerPayload: (evaluationId, callbackUrl) =>
        buildClawagentDisputeTriggerPayload({
          evaluationId,
          reviewDisputeId: dto.dispute_id,
          caseFileId: caseFile.id,
          title: `Dispute for case file ${caseFile.id}`,
          claimantArgument: dispute.dispute_reason,
          respondentArgument,
          requestPayload: payload,
          callbackUrl,
        }),
    })

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
    const workflow = await this.sources.findSprintReverseReviewWorkflow(dto.dispute_id)
    if (!workflow) throw new NotFoundException('Review dispute not found')

    const reportMessage = await this.sources.findSprintReverseReviewReportMessage(workflow.id)
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
    const created = await this.stageAndTriggerEvaluation({
      disputeId: workflow.id,
      caseFileId: null,
      sourceType: 'sprint_reverse_review_workflow',
      sourceId: workflow.id,
      sourceTable: 'sprint_reverse_review_workflows',
      expectedSourceStatus: workflow.status,
      provider: dto.provider,
      requestPayload: payload,
      buildTriggerPayload: (evaluationId, callbackUrl) =>
        buildClawagentDisputeTriggerPayload({
          evaluationId,
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
        }),
    })

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
    const dispute = await this.sources.findSprintReviewDispute(dto.dispute_id)
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
    const created = await this.stageAndTriggerEvaluation({
      disputeId: dispute.id,
      caseFileId: null,
      sourceType: 'sprint_review_dispute',
      sourceId: dispute.id,
      sourceTable: 'sprint_review_disputes',
      expectedSourceStatus: dispute.status,
      provider: dto.provider,
      requestPayload: payload,
      buildTriggerPayload: (evaluationId, callbackUrl) =>
        buildClawagentDisputeTriggerPayload({
          evaluationId,
          reviewDisputeId: dispute.id,
          caseFileId: null,
          sourceType: 'sprint_review_dispute',
          sourceId: dispute.id,
          title: `Sprint review dispute ${dispute.id}`,
          claimantArgument: dispute.dispute_reason,
          respondentArgument: 'Sprint review runtime context is provided in context.',
          requestPayload: payload,
          callbackUrl,
        }),
    })

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
        disputeId: dispute.id,
        change: {
          ai_evaluation_id: created['id'],
          case_file_id: null,
          source_type: 'sprint_review_dispute',
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

  private assertCanStartTaskReviewWorkflowEvaluation(
    actorSystemRole: string,
    workflowStatus: string,
    hasRuntimeContext: boolean
  ): void {
    if (actorSystemRole !== 'system_admin' && actorSystemRole !== 'superadmin') {
      throw new ForbiddenException('Only system admin can start AI dispute evaluation')
    }

    if (workflowStatus !== 'reported' && workflowStatus !== 'ai_failed') {
      throw new BusinessLogicException(
        'Only reported or AI-failed task review workflows can start AI evaluation'
      )
    }

    if (!hasRuntimeContext) {
      throw new BusinessLogicException('AI dispute evaluation requires task review runtime context')
    }
  }

  private async executeTaskReviewWorkflowEvaluation(
    dto: StartAiDisputeEvaluationDTO,
    actorSystemRole: string,
    startedAt: number
  ): Promise<AiDisputeEvaluationResult> {
    const workflow = await this.sources.findTaskReviewWorkflow(dto.dispute_id)
    if (!workflow) throw new NotFoundException('Review dispute not found')

    const reportMessage = await this.sources.findTaskReviewReportMessage(workflow.id)
    const runtimeContext = parseJsonObject(workflow.runtime_context)
    this.assertCanStartTaskReviewWorkflowEvaluation(
      actorSystemRole,
      workflow.status,
      Object.keys(runtimeContext).length > 0
    )

    const payload = buildTaskReviewWorkflowPayload(workflow, reportMessage ?? undefined)
    const created = await this.stageAndTriggerEvaluation({
      disputeId: workflow.id,
      caseFileId: null,
      sourceType: 'task_review_workflow',
      sourceId: workflow.id,
      sourceTable: 'task_review_workflows',
      expectedSourceStatus: workflow.status,
      provider: dto.provider,
      requestPayload: payload,
      buildTriggerPayload: (evaluationId, callbackUrl) =>
        buildClawagentDisputeTriggerPayload({
          evaluationId,
          reviewDisputeId: workflow.id,
          caseFileId: null,
          sourceType: 'task_review_workflow',
          sourceId: workflow.id,
          title: `Task review workflow ${workflow.id}`,
          claimantArgument: reportMessage?.body ?? 'Task review workflow dispute.',
          respondentArgument: 'Task review workflow runtime context is provided in context.',
          requestPayload: payload,
          callbackUrl,
        }),
    })

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
          source_type: 'task_review_workflow',
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
}
