import {
  buildClawagentDisputeTriggerPayload,
  buildSprintReverseReviewWorkflowPayload,
  buildSprintReviewDisputePayload,
  buildTaskReviewWorkflowPayload,
  normalize,
  parseJsonObject,
  type AiDisputeEvaluationResult,
  type AiDisputeRequestPayload,
} from './ai_dispute_payload_assemblers.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import { platformWorkflowLogger } from '#modules/observability/public_contracts/platform_observability'
import type { AiDisputeSourceTable } from '#modules/disputes/actions/ports/outbound/ai_dispute_evaluation_gateway'
import type { AiDisputeEvaluationSourceReader } from '#modules/disputes/actions/ports/outbound/ai_dispute_evaluation_source_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canStartAiDisputeEvaluation } from '#modules/disputes/domain/ai_dispute_rules'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'
import type { AiDisputeSourceType } from '#modules/disputes/public_contracts/ai_dispute_auto_queue'

export interface StageAndTriggerAiDisputeEvaluationInput {
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

export interface WorkflowEvaluationContext {
  execCtx: ReviewActionContext
  sources: AiDisputeEvaluationSourceReader
  stageAndTrigger: (input: StageAndTriggerAiDisputeEvaluationInput) => Promise<Record<string, unknown>>
}

export function assertCanStartSprintReverseWorkflowEvaluation(
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

export async function executeSprintReverseReviewWorkflowEvaluation(
  context: WorkflowEvaluationContext,
  dto: { dispute_id: string; provider: string },
  actorSystemRole: string,
  startedAt: number
): Promise<AiDisputeEvaluationResult> {
  const { execCtx, sources, stageAndTrigger } = context
  const workflow = await sources.findSprintReverseReviewWorkflow(dto.dispute_id)
  if (!workflow) throw new NotFoundException('Review dispute not found')

  const reportMessage = await sources.findSprintReverseReviewReportMessage(workflow.id)
  if (!reportMessage) {
    throw new NotFoundException('Sprint reverse review report not found')
  }

  const reportMetadata = parseJsonObject(reportMessage.metadata)
  const runtimeContext = parseJsonObject(reportMetadata['runtime_context'])
  assertCanStartSprintReverseWorkflowEvaluation(
    actorSystemRole,
    workflow.status,
    Object.keys(runtimeContext).length > 0
  )

  const payload = buildSprintReverseReviewWorkflowPayload(workflow, reportMessage)
  const created = await stageAndTrigger({
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
    execCtx,
    buildReviewDisputeEvent(execCtx, {
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

export async function executeSprintReviewDisputeEvaluation(
  context: WorkflowEvaluationContext,
  dto: { dispute_id: string; provider: string },
  actorSystemRole: string,
  startedAt: number
): Promise<AiDisputeEvaluationResult> {
  const { execCtx, sources, stageAndTrigger } = context
  const dispute = await sources.findSprintReviewDispute(dto.dispute_id)
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
  const created = await stageAndTrigger({
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
    execCtx,
    buildReviewDisputeEvent(execCtx, {
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

export function assertCanStartTaskReviewWorkflowEvaluation(
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

export async function executeTaskReviewWorkflowEvaluation(
  context: WorkflowEvaluationContext,
  dto: { dispute_id: string; provider: string },
  actorSystemRole: string,
  startedAt: number
): Promise<AiDisputeEvaluationResult> {
  const { execCtx, sources, stageAndTrigger } = context
  const workflow = await sources.findTaskReviewWorkflow(dto.dispute_id)
  if (!workflow) throw new NotFoundException('Review dispute not found')

  const reportMessage = await sources.findTaskReviewReportMessage(workflow.id)
  const runtimeContext = parseJsonObject(workflow.runtime_context)
  assertCanStartTaskReviewWorkflowEvaluation(
    actorSystemRole,
    workflow.status,
    Object.keys(runtimeContext).length > 0
  )

  const payload = buildTaskReviewWorkflowPayload(workflow, reportMessage ?? undefined)
  const created = await stageAndTrigger({
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
    execCtx,
    buildReviewDisputeEvent(execCtx, {
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
