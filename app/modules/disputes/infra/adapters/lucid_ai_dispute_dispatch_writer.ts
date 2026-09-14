import db from '@adonisjs/lucid/services/db'

import {
  type AiDisputeDispatchStateRow,
  calculateAiDisputeRetryDelayMs,
  type DispatchAiDisputeEvaluationInput,
  type DispatchAiDisputeEvaluationResult,
  TERMINAL_EVALUATION_STATUSES,
  toDispatchResult,
  triggerErrorMessage,
} from './ai_dispute_gateway_types.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { ClawagentTriggerResult } from '#modules/disputes/infra/adapters/clawagent_dispute_client'
import { lockClassicReviewDisputeGovernance } from '#modules/reviews/infra/adapters/review-core/lucid_classic_review_governance_lock'
import { lockTaskReviewWorkflowGovernance } from '#modules/reviews/infra/adapters/task-review/lucid_task_review_workflow_governance_lock'

export interface AiDisputeFailureRecorderOptions {
  readonly maxAttempts: number
  readonly retryBaseMs: number
  readonly retryCapMs: number
  readonly random: () => number
  readonly now: () => Date
}

export async function recordDispatchAcceptance(
  input: DispatchAiDisputeEvaluationInput,
  dispatchToken: string,
  externalRunId: string | null
): Promise<DispatchAiDisputeEvaluationResult> {
  return db.transaction(async (trx) => {
    const preflight = (await trx
      .from('ai_dispute_evaluations')
      .where('id', input.evaluationId)
      .select(
        'status',
        'external_run_id',
        'error_message',
        'trigger_error_retryable',
        'trigger_attempt_count',
        'trigger_state',
        'trigger_dispatch_token'
      )
      .first()) as AiDisputeDispatchStateRow | undefined
    if (!preflight) {
      throw new InvariantViolationException(
        'AI dispute evaluation disappeared after Clawagent accepted it'
      )
    }
    if (
      preflight.trigger_state !== 'dispatching' ||
      preflight.trigger_dispatch_token !== dispatchToken
    ) {
      return toDispatchResult(preflight, true)
    }

    if (input.sourceTable === 'review_disputes') {
      const governance = await lockClassicReviewDisputeGovernance(trx, input.sourceId)
      if (!governance) {
        throw new InvariantViolationException(
          'AI dispute evaluation references a missing classic review dispute'
        )
      }
    } else if (input.sourceTable === 'task_review_workflows') {
      const governance = await lockTaskReviewWorkflowGovernance(trx, input.sourceId)
      if (!governance) {
        throw new InvariantViolationException(
          'AI dispute evaluation references a missing task review workflow'
        )
      }
    }

    const evaluation = (await trx
      .from('ai_dispute_evaluations')
      .where('id', input.evaluationId)
      .forUpdate()
      .select(
        'status',
        'external_run_id',
        'error_message',
        'trigger_error_retryable',
        'trigger_attempt_count',
        'trigger_state',
        'trigger_dispatch_token'
      )
      .first()) as AiDisputeDispatchStateRow | undefined

    if (!evaluation) {
      throw new InvariantViolationException(
        'AI dispute evaluation disappeared after Clawagent accepted it'
      )
    }

    if (
      evaluation.trigger_state !== 'dispatching' ||
      evaluation.trigger_dispatch_token !== dispatchToken
    ) {
      return toDispatchResult(evaluation, true)
    }

    const terminal = TERMINAL_EVALUATION_STATUSES.has(evaluation.status)
    if (!terminal) {
      const updatedSources = (await trx
        .from(input.sourceTable)
        .where('id', input.sourceId)
        .where('status', input.expectedSourceStatus)
        .update({
          status: 'ai_reviewing',
          updated_at: db.raw('NOW()'),
        })
        .returning(['id'])) as Array<{ id: string }>

      if (updatedSources.length !== 1) {
        throw new InvariantViolationException(
          'AI dispute source changed while Clawagent acceptance was being recorded'
        )
      }
    }

    const status = terminal ? evaluation.status : 'processing'
    const evaluationUpdate: Record<string, unknown> = {
      status,
      trigger_state: 'accepted',
      trigger_dispatch_token: null,
      trigger_accepted_at: db.raw('NOW()'),
      trigger_error_code: null,
      trigger_error_retryable: null,
      trigger_next_attempt_at: null,
      error_message: null,
    }
    if (externalRunId) {
      evaluationUpdate['external_run_id'] = externalRunId
    }

    await trx
      .from('ai_dispute_evaluations')
      .where('id', input.evaluationId)
      .where('trigger_state', 'dispatching')
      .where('trigger_dispatch_token', dispatchToken)
      .update(evaluationUpdate)

    return {
      status,
      externalRunId,
      errorMessage: null,
      retryable: null,
      leaseLost: false,
    }
  })
}

export async function recordDispatchFailure(
  evaluationId: string,
  dispatchToken: string,
  result: Extract<ClawagentTriggerResult, { ok: false }>,
  options: AiDisputeFailureRecorderOptions
): Promise<DispatchAiDisputeEvaluationResult> {
  return db.transaction(async (trx) => {
    const evaluation = (await trx
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .forUpdate()
      .select(
        'status',
        'external_run_id',
        'error_message',
        'trigger_error_retryable',
        'trigger_attempt_count',
        'trigger_state',
        'trigger_dispatch_token'
      )
      .first()) as AiDisputeDispatchStateRow | undefined

    if (!evaluation) {
      throw new InvariantViolationException(
        'AI dispute evaluation disappeared after dispatch failure'
      )
    }

    if (
      evaluation.trigger_state !== 'dispatching' ||
      evaluation.trigger_dispatch_token !== dispatchToken
    ) {
      return toDispatchResult(evaluation, true)
    }

    if (TERMINAL_EVALUATION_STATUSES.has(evaluation.status)) {
      return toDispatchResult(evaluation, false)
    }

    const errorMessage = triggerErrorMessage(result)
    const willRetry = result.retryable && evaluation.trigger_attempt_count < options.maxAttempts
    const status = willRetry ? evaluation.status : 'failed'
    const retryDelayMs = willRetry
      ? calculateAiDisputeRetryDelayMs(
          evaluation.trigger_attempt_count,
          options.retryBaseMs,
          options.retryCapMs,
          options.random
        )
      : null
    await trx
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .update({
        status,
        trigger_state: willRetry ? 'retryable_failure' : 'permanent_failure',
        trigger_dispatch_token: null,
        trigger_error_code: result.code,
        trigger_error_retryable: willRetry,
        trigger_next_attempt_at:
          retryDelayMs === null ? null : new Date(options.now().getTime() + retryDelayMs),
        error_message: errorMessage,
        completed_at: willRetry ? null : db.raw('NOW()'),
      })

    return {
      status,
      externalRunId: evaluation.external_run_id,
      errorMessage,
      retryable: willRetry,
      leaseLost: false,
    }
  })
}
