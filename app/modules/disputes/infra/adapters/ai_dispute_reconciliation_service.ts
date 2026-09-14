import db from '@adonisjs/lucid/services/db'

import {
  type AiDisputeReconciliationResult,
  type AiDisputeReconciliationRow,
  type AiDisputeSourceTable,
  type DispatchAiDisputeEvaluationInput,
  type DispatchAiDisputeEvaluationResult,
  isAiDisputeSourceTable,
  parseTriggerPayload,
} from './ai_dispute_gateway_types.js'

import type { PlatformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import { buildReviewAiDisputeDispatchAmbiguousEvent } from '#modules/reviews/observability/review_event_factory'

export interface AiDisputeReconciliationServiceDependencies {
  maxAttempts: number
  staleDispatchMs: number
  reconciliationBatchSize: number
  now: () => Date
  operationalLogger: Pick<PlatformOperationalLogger, 'log'>
  dispatch: (
    input: DispatchAiDisputeEvaluationInput,
    signal?: AbortSignal
  ) => Promise<DispatchAiDisputeEvaluationResult>
}

export class AiDisputeReconciliationService {
  constructor(private readonly deps: AiDisputeReconciliationServiceDependencies) {}

  async reconcileOnce(signal?: AbortSignal): Promise<AiDisputeReconciliationResult> {
    if (signal?.aborted) {
      return this.emptyReconciliationResult()
    }
    const now = this.deps.now()
    const staleBefore = new Date(now.getTime() - this.deps.staleDispatchMs)

    const recoveredStale = await db
      .from('ai_dispute_evaluations')
      .whereIn('status', ['queued', 'processing'])
      .where('trigger_state', 'dispatching')
      .where('trigger_attempt_count', '<', this.deps.maxAttempts)
      .where('trigger_last_attempt_at', '<=', staleBefore)
      .update({
        trigger_state: 'retryable_failure',
        trigger_dispatch_token: null,
        trigger_error_code: 'CLAWAGENT_AMBIGUOUS_DISPATCH',
        trigger_error_retryable: true,
        trigger_next_attempt_at: now,
        error_message: 'CLAWAGENT_AMBIGUOUS_DISPATCH: prior dispatch outcome was not recorded',
      })

    const exhausted = await db
      .from('ai_dispute_evaluations')
      .whereIn('status', ['queued', 'processing'])
      .whereIn('trigger_state', ['dispatching', 'retryable_failure'])
      .where('trigger_attempt_count', '>=', this.deps.maxAttempts)
      .update({
        status: 'failed',
        trigger_state: 'permanent_failure',
        trigger_dispatch_token: null,
        trigger_error_code: 'CLAWAGENT_RETRY_EXHAUSTED',
        trigger_error_retryable: false,
        trigger_next_attempt_at: null,
        error_message: 'CLAWAGENT_RETRY_EXHAUSTED: retry budget exhausted',
        completed_at: now,
      })

    const rows = (await db
      .from('ai_dispute_evaluations')
      .whereIn('status', ['queued', 'processing'])
      .whereIn('trigger_state', ['pending', 'retryable_failure'])
      .where('trigger_attempt_count', '<', this.deps.maxAttempts)
      .where((query) => {
        void query
          .whereNull('trigger_next_attempt_at')
          .orWhere('trigger_next_attempt_at', '<=', now)
      })
      .orderBy('trigger_next_attempt_at', 'asc')
      .orderBy('created_at', 'asc')
      .limit(this.deps.reconciliationBatchSize)
      .select(
        'id',
        'source_id',
        'trigger_source_table',
        'trigger_expected_source_status',
        'trigger_payload'
      )) as AiDisputeReconciliationRow[]

    const result: AiDisputeReconciliationResult = {
      recoveredStale: Number(recoveredStale),
      exhausted: Number(exhausted),
      selected: rows.length,
      accepted: 0,
      retried: 0,
      permanentFailures: 0,
      skipped: 0,
      shutdownDeferred: 0,
    }

    for (const [index, row] of rows.entries()) {
      if (signal?.aborted) {
        result.shutdownDeferred += rows.length - index
        break
      }
      const triggerPayload = parseTriggerPayload(row.trigger_payload)
      const sourceTable = row.trigger_source_table
      const expectedSourceStatus = row.trigger_expected_source_status
      if (
        !sourceTable ||
        !isAiDisputeSourceTable(sourceTable) ||
        !expectedSourceStatus ||
        !triggerPayload
      ) {
        await this.recordMalformedReconciliationRow(row.id)
        result.permanentFailures += 1
        continue
      }

      try {
        const dispatchResult = await this.deps.dispatch(
          {
            evaluationId: row.id,
            sourceTable,
            sourceId: row.source_id,
            expectedSourceStatus,
            triggerPayload,
          },
          signal
        )

        if (dispatchResult.leaseLost) {
          result.skipped += 1
        } else if (dispatchResult.status === 'processing' && dispatchResult.errorMessage === null) {
          result.accepted += 1
        } else if (dispatchResult.retryable === true) {
          result.retried += 1
        } else if (dispatchResult.status === 'failed') {
          result.permanentFailures += 1
        } else {
          result.skipped += 1
        }
      } catch (error) {
        // Keep the durable `dispatching` state. A later pass will reclaim it
        // only after the stale deadline and retry with the same idempotency key.
        this.logAmbiguousDispatchSafely(row.id, sourceTable, error)
        result.skipped += 1
        if (signal?.aborted) {
          result.shutdownDeferred += rows.length - index - 1
          break
        }
      }
    }

    return result
  }

  private emptyReconciliationResult(): AiDisputeReconciliationResult {
    return {
      recoveredStale: 0,
      exhausted: 0,
      selected: 0,
      accepted: 0,
      retried: 0,
      permanentFailures: 0,
      skipped: 0,
      shutdownDeferred: 0,
    }
  }

  private logAmbiguousDispatchSafely(
    evaluationId: string,
    sourceTable: AiDisputeSourceTable,
    error: unknown
  ): void {
    try {
      this.deps.operationalLogger.log(
        'warn',
        buildReviewAiDisputeDispatchAmbiguousEvent({
          evaluationId,
          sourceTable,
          staleDispatchMs: this.deps.staleDispatchMs,
          error,
        })
      )
    } catch {
      // Telemetry is best-effort and must never stop durable reconciliation.
    }
  }

  private async recordMalformedReconciliationRow(evaluationId: string): Promise<void> {
    await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .whereIn('status', ['queued', 'processing'])
      .whereIn('trigger_state', ['pending', 'retryable_failure'])
      .update({
        status: 'failed',
        trigger_state: 'permanent_failure',
        trigger_dispatch_token: null,
        trigger_error_code: 'CLAWAGENT_TRIGGER_RECORD_INVALID',
        trigger_error_retryable: false,
        trigger_next_attempt_at: null,
        error_message: 'CLAWAGENT_TRIGGER_RECORD_INVALID: durable trigger metadata is incomplete',
        completed_at: this.deps.now(),
      })
  }
}
