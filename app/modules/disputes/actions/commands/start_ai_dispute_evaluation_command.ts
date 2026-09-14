import {
  buildClawagentDisputeTriggerPayload,
  normalize,
  parseJsonArray,
  parseJsonObject,
  requireUserId,
  type AiDisputeEvaluationResult,
} from './ai_dispute_payload_assemblers.js'
import {
  executeSprintReverseReviewWorkflowEvaluation,
  executeSprintReviewDisputeEvaluation,
  executeTaskReviewWorkflowEvaluation,
  type StageAndTriggerAiDisputeEvaluationInput,
  type WorkflowEvaluationContext,
} from './workflow_dispute_evaluation_handlers.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type {
  AiDisputeEvaluationGateway,
} from '#modules/disputes/actions/ports/outbound/ai_dispute_evaluation_gateway'
import type { AiDisputeEvaluationSourceReader } from '#modules/disputes/actions/ports/outbound/ai_dispute_evaluation_source_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { buildAiDisputePayload } from '#modules/disputes/domain/ai_dispute_payload_builder'
import { canStartAiDisputeEvaluation } from '#modules/disputes/domain/ai_dispute_rules'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'
import type { AiDisputeSourceType } from '#modules/disputes/public_contracts/ai_dispute_auto_queue'

export type { AiDisputeSourceType } from '#modules/disputes/public_contracts/ai_dispute_auto_queue'
export type {
  AiDisputeEvaluationResult,
  AiDisputeRequestPayload,
  ClawagentDisputeTriggerPayloadInput,
} from './ai_dispute_payload_assemblers.js'
export { buildClawagentDisputeTriggerPayload } from './ai_dispute_payload_assemblers.js'
export type { StageAndTriggerAiDisputeEvaluationInput } from './workflow_dispute_evaluation_handlers.js'

export interface StartAiDisputeEvaluationDTO {
  dispute_id: string
  provider: string
  source_type?: AiDisputeSourceType
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

    const workflowContext: WorkflowEvaluationContext = {
      execCtx: this.execCtx,
      sources: this.sources,
      stageAndTrigger: (input) => this.stageAndTriggerEvaluation(input),
    }

    if (dto.source_type === 'sprint_review_dispute') {
      return executeSprintReviewDisputeEvaluation(workflowContext, dto, actorSystemRole, startedAt)
    }

    if (dto.source_type === 'sprint_reverse_review_workflow') {
      return executeSprintReverseReviewWorkflowEvaluation(workflowContext, dto, actorSystemRole, startedAt)
    }

    if (dto.source_type === 'task_review_workflow') {
      return executeTaskReviewWorkflowEvaluation(workflowContext, dto, actorSystemRole, startedAt)
    }

    const dispute = await this.sources.findReviewDispute(dto.dispute_id)
    if (!dispute) {
      return executeSprintReviewDisputeEvaluation(workflowContext, dto, actorSystemRole, startedAt)
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
}
