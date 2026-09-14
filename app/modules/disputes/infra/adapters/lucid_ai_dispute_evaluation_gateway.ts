import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import {
  type AiDisputeDispatchStateRow,
  type AiDisputeReconciliationResult,
  type AiDisputeSourceTable,
  calculateAiDisputeRetryDelayMs,
  configuredInteger,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_RECONCILIATION_BATCH_SIZE,
  DEFAULT_RETRY_BASE_MS,
  DEFAULT_RETRY_CAP_MS,
  DEFAULT_STALE_DISPATCH_MS,
  type DispatchAiDisputeEvaluationInput,
  type DispatchAiDisputeEvaluationResult,
  type LucidAiDisputeEvaluationGatewayOptions,
  requiredPositiveInteger,
  type StageAiDisputeEvaluationInput,
  type StagedAiDisputeEvaluation,
  toDispatchResult,
} from './ai_dispute_gateway_types.js'
import {
  AiDisputeReconciliationService,
} from './ai_dispute_reconciliation_service.js'
import {
  recordDispatchAcceptance,
  recordDispatchFailure,
} from './lucid_ai_dispute_dispatch_writer.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  platformOperationalLogger,
  type PlatformOperationalLogger,
} from '#modules/observability/public_contracts/platform_observability'
import {
  ClawagentDisputeClient,
} from '#modules/disputes/infra/adapters/clawagent_dispute_client'

export type {
  AiDisputeReconciliationResult,
  AiDisputeSourceTable,
  DispatchAiDisputeEvaluationInput,
  DispatchAiDisputeEvaluationResult,
  LucidAiDisputeEvaluationGatewayOptions,
  StageAiDisputeEvaluationInput,
  StagedAiDisputeEvaluation,
}
export {
  calculateAiDisputeRetryDelayMs,
  configuredInteger,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_RECONCILIATION_BATCH_SIZE,
  DEFAULT_RETRY_BASE_MS,
  DEFAULT_RETRY_CAP_MS,
  DEFAULT_STALE_DISPATCH_MS,
  requiredPositiveInteger,
}

export class LucidAiDisputeEvaluationGateway {
  private readonly maxAttempts: number
  private readonly retryBaseMs: number
  private readonly retryCapMs: number
  private readonly staleDispatchMs: number
  private readonly reconciliationBatchSize: number
  private readonly random: () => number
  private readonly now: () => Date
  private readonly operationalLogger: Pick<PlatformOperationalLogger, 'log'>
  private readonly reconciliationService: AiDisputeReconciliationService

  constructor(
    private readonly client: ClawagentDisputeClient,
    options: LucidAiDisputeEvaluationGatewayOptions = {}
  ) {
    this.maxAttempts = requiredPositiveInteger(
      'maxAttempts',
      options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      1,
      100
    )
    this.retryBaseMs = requiredPositiveInteger(
      'retryBaseMs',
      options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS,
      100,
      3_600_000
    )
    this.retryCapMs = requiredPositiveInteger(
      'retryCapMs',
      options.retryCapMs ?? DEFAULT_RETRY_CAP_MS,
      this.retryBaseMs,
      86_400_000
    )
    this.staleDispatchMs = requiredPositiveInteger(
      'staleDispatchMs',
      options.staleDispatchMs ?? DEFAULT_STALE_DISPATCH_MS,
      1_000,
      86_400_000
    )
    this.reconciliationBatchSize = requiredPositiveInteger(
      'reconciliationBatchSize',
      options.reconciliationBatchSize ?? DEFAULT_RECONCILIATION_BATCH_SIZE,
      1,
      100
    )
    this.random = options.random ?? Math.random
    this.now = options.now ?? (() => new Date())
    this.operationalLogger = options.operationalLogger ?? platformOperationalLogger

    this.reconciliationService = new AiDisputeReconciliationService({
      maxAttempts: this.maxAttempts,
      staleDispatchMs: this.staleDispatchMs,
      reconciliationBatchSize: this.reconciliationBatchSize,
      now: this.now,
      operationalLogger: this.operationalLogger,
      dispatch: (input, signal) => this.dispatch(input, signal),
    })
  }

  static fromEnvironment(): LucidAiDisputeEvaluationGateway {
    return new LucidAiDisputeEvaluationGateway(ClawagentDisputeClient.fromEnvironment(), {
      maxAttempts: configuredInteger(
        process.env,
        'CLAWAGENT_TRIGGER_MAX_ATTEMPTS',
        DEFAULT_MAX_ATTEMPTS,
        1,
        100
      ),
      retryBaseMs: configuredInteger(
        process.env,
        'CLAWAGENT_TRIGGER_RETRY_BASE_MS',
        DEFAULT_RETRY_BASE_MS,
        100,
        3_600_000
      ),
      retryCapMs: configuredInteger(
        process.env,
        'CLAWAGENT_TRIGGER_RETRY_CAP_MS',
        DEFAULT_RETRY_CAP_MS,
        100,
        86_400_000
      ),
      staleDispatchMs: configuredInteger(
        process.env,
        'CLAWAGENT_TRIGGER_STALE_DISPATCH_MS',
        DEFAULT_STALE_DISPATCH_MS,
        1_000,
        86_400_000
      ),
      reconciliationBatchSize: configuredInteger(
        process.env,
        'CLAWAGENT_TRIGGER_BATCH_SIZE',
        DEFAULT_RECONCILIATION_BATCH_SIZE,
        1,
        100
      ),
    })
  }

  /**
   * Persists the evaluation and the exact outbound request in one transaction.
   * A process crash after this method leaves a complete `pending` record that a
   * reconciliation worker can safely dispatch with the evaluation id as its
   * stable idempotency key.
   */
  async stage(input: StageAiDisputeEvaluationInput): Promise<StagedAiDisputeEvaluation> {
    return db.transaction(async (trx) => {
      const [created] = (await trx
        .table('ai_dispute_evaluations')
        .insert({
          dispute_id: input.disputeId,
          case_file_id: input.caseFileId,
          source_type: input.sourceType,
          source_id: input.sourceId,
          provider: input.provider,
          status: 'queued',
          request_payload: JSON.stringify(input.requestPayload),
          trigger_state: 'pending',
          trigger_source_table: input.sourceTable,
          trigger_expected_source_status: input.expectedSourceStatus,
          trigger_next_attempt_at: db.raw('NOW()'),
        })
        .returning('*')) as [Record<string, unknown>]

      const evaluationId = created['id'] as string
      const triggerPayload = input.buildTriggerPayload(evaluationId)
      await trx
        .from('ai_dispute_evaluations')
        .where('id', evaluationId)
        .update({
          trigger_payload: JSON.stringify(triggerPayload),
        })

      created['trigger_state'] = 'pending'
      created['trigger_payload'] = triggerPayload
      await input.beforeCommit?.(trx, created)
      return { created, triggerPayload }
    })
  }

  /**
   * Performs one dispatch attempt. The external acceptance and both local
   * status changes cannot be globally atomic, so the durable `dispatching`
   * state records the ambiguous window. Retrying the same evaluation id is
   * safe when Clawagent honours the idempotency header.
   */
  async dispatch(
    input: DispatchAiDisputeEvaluationInput,
    signal?: AbortSignal
  ): Promise<DispatchAiDisputeEvaluationResult> {
    signal?.throwIfAborted()
    const dispatchToken = randomUUID()
    const claimedRows = (await db
      .from('ai_dispute_evaluations')
      .where('id', input.evaluationId)
      .whereIn('status', ['queued', 'processing'])
      .whereIn('trigger_state', ['pending', 'retryable_failure'])
      .update({
        trigger_state: 'dispatching',
        trigger_dispatch_token: dispatchToken,
        trigger_attempt_count: db.raw('trigger_attempt_count + 1'),
        trigger_last_attempt_at: db.raw('NOW()'),
        trigger_error_code: null,
        trigger_error_retryable: null,
        trigger_next_attempt_at: null,
      })
      .returning(['id', 'trigger_attempt_count'])) as Array<{
      id: string
      trigger_attempt_count: number
    }>

    if (claimedRows.length === 0) {
      const current = (await db
        .from('ai_dispute_evaluations')
        .where('id', input.evaluationId)
        .select('status', 'external_run_id', 'error_message', 'trigger_error_retryable')
        .first()) as AiDisputeDispatchStateRow | undefined

      if (!current) {
        throw new InvariantViolationException('AI dispute evaluation disappeared before dispatch')
      }

      return toDispatchResult(current, true)
    }

    signal?.throwIfAborted()
    const result = await this.client.trigger(input.evaluationId, input.triggerPayload, signal)
    if (!result.ok) {
      return recordDispatchFailure(input.evaluationId, dispatchToken, result, {
        maxAttempts: this.maxAttempts,
        retryBaseMs: this.retryBaseMs,
        retryCapMs: this.retryCapMs,
        random: this.random,
        now: this.now,
      })
    }

    return recordDispatchAcceptance(input, dispatchToken, result.externalRunId)
  }

  async reconcileOnce(signal?: AbortSignal): Promise<AiDisputeReconciliationResult> {
    return this.reconciliationService.reconcileOnce(signal)
  }
}
