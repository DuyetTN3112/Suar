import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  platformOperationalLogger,
  type PlatformOperationalLogger,
} from '#modules/observability/public_contracts/platform_observability'
import {
  ClawagentDisputeClient,
  type ClawagentTriggerResult,
} from '#modules/reviews/infra/adapters/disputes/clawagent_dispute_client'
import { lockClassicReviewDisputeGovernance } from '#modules/reviews/infra/adapters/review-core/lucid_classic_review_governance_lock'
import { lockTaskReviewWorkflowGovernance } from '#modules/reviews/infra/adapters/task-review/lucid_task_review_workflow_governance_lock'
import { buildReviewAiDisputeDispatchAmbiguousEvent } from '#modules/reviews/observability/review_event_factory'

export type AiDisputeSourceTable =
  | 'review_disputes'
  | 'sprint_review_disputes'
  | 'sprint_reverse_review_workflows'
  | 'task_review_workflows'

export interface StageAiDisputeEvaluationInput {
  disputeId: string
  caseFileId: string | null
  sourceType: string
  sourceId: string
  sourceTable: AiDisputeSourceTable
  expectedSourceStatus: string
  provider: string
  requestPayload: Record<string, unknown>
  buildTriggerPayload: (evaluationId: string) => Record<string, unknown>
  beforeCommit?: (transaction: unknown, created: Record<string, unknown>) => Promise<void>
}

export interface StagedAiDisputeEvaluation {
  created: Record<string, unknown>
  triggerPayload: Record<string, unknown>
}

export interface DispatchAiDisputeEvaluationInput {
  evaluationId: string
  sourceTable: AiDisputeSourceTable
  sourceId: string
  expectedSourceStatus: string
  triggerPayload: Record<string, unknown>
}

export interface DispatchAiDisputeEvaluationResult {
  status: string
  externalRunId: string | null
  errorMessage: string | null
  retryable: boolean | null
  leaseLost: boolean
}

export interface LucidAiDisputeEvaluationGatewayOptions {
  maxAttempts?: number
  retryBaseMs?: number
  retryCapMs?: number
  staleDispatchMs?: number
  reconciliationBatchSize?: number
  random?: () => number
  now?: () => Date
  operationalLogger?: Pick<PlatformOperationalLogger, 'log'>
}

export interface AiDisputeReconciliationResult {
  recoveredStale: number
  exhausted: number
  selected: number
  accepted: number
  retried: number
  permanentFailures: number
  skipped: number
  shutdownDeferred: number
}

interface AiDisputeReconciliationRow {
  id: string
  source_id: string
  trigger_source_table: string | null
  trigger_expected_source_status: string | null
  trigger_payload: unknown
}

interface AiDisputeDispatchStateRow {
  status: string
  external_run_id: string | null
  error_message: string | null
  trigger_error_retryable: boolean | null
  trigger_attempt_count: number
  trigger_state: string
  trigger_dispatch_token: string | null
}

const TERMINAL_EVALUATION_STATUSES = new Set(['completed', 'failed', 'cancelled'])
const AI_DISPUTE_SOURCE_TABLES = new Set<AiDisputeSourceTable>([
  'review_disputes',
  'sprint_review_disputes',
  'sprint_reverse_review_workflows',
  'task_review_workflows',
])
const DEFAULT_MAX_ATTEMPTS = 8
const DEFAULT_RETRY_BASE_MS = 1_000
const DEFAULT_RETRY_CAP_MS = 300_000
const DEFAULT_STALE_DISPATCH_MS = 60_000
const DEFAULT_RECONCILIATION_BATCH_SIZE = 25

function configuredInteger(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const raw = environment[name]
  if (raw === undefined || raw.trim() === '') {
    return fallback
  }

  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
  return value
}

function requiredPositiveInteger(
  name: string,
  value: number,
  minimum: number,
  maximum: number
): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
  return value
}

export function calculateAiDisputeRetryDelayMs(
  attempt: number,
  baseMs: number,
  capMs: number,
  random: () => number = Math.random
): number {
  const exponential = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt - 1))
  const jitterFactor = 0.5 + Math.min(1, Math.max(0, random())) * 0.5
  return Math.max(1, Math.floor(exponential * jitterFactor))
}

function isAiDisputeSourceTable(value: string): value is AiDisputeSourceTable {
  return AI_DISPUTE_SOURCE_TABLES.has(value as AiDisputeSourceTable)
}

function parseTriggerPayload(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value !== 'string') {
    return null
  }
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function triggerErrorMessage(result: Extract<ClawagentTriggerResult, { ok: false }>): string {
  return `${result.code}: ${result.diagnostic}`
}

function toDispatchResult(
  row: Pick<
    AiDisputeDispatchStateRow,
    'status' | 'external_run_id' | 'error_message' | 'trigger_error_retryable'
  >,
  leaseLost: boolean
): DispatchAiDisputeEvaluationResult {
  return {
    status: row.status,
    externalRunId: row.external_run_id,
    errorMessage: row.error_message,
    retryable: row.trigger_error_retryable,
    leaseLost,
  }
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
      return this.recordFailure(input.evaluationId, dispatchToken, result)
    }

    return this.recordAcceptance(input, dispatchToken, result.externalRunId)
  }

  private async recordAcceptance(
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

  private async recordFailure(
    evaluationId: string,
    dispatchToken: string,
    result: Extract<ClawagentTriggerResult, { ok: false }>
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
      const willRetry = result.retryable && evaluation.trigger_attempt_count < this.maxAttempts
      const status = willRetry ? evaluation.status : 'failed'
      const retryDelayMs = willRetry
        ? calculateAiDisputeRetryDelayMs(
            evaluation.trigger_attempt_count,
            this.retryBaseMs,
            this.retryCapMs,
            this.random
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
            retryDelayMs === null ? null : new Date(this.now().getTime() + retryDelayMs),
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

  async reconcileOnce(signal?: AbortSignal): Promise<AiDisputeReconciliationResult> {
    if (signal?.aborted) {
      return this.emptyReconciliationResult()
    }
    const now = this.now()
    const staleBefore = new Date(now.getTime() - this.staleDispatchMs)

    const recoveredStale = await db
      .from('ai_dispute_evaluations')
      .whereIn('status', ['queued', 'processing'])
      .where('trigger_state', 'dispatching')
      .where('trigger_attempt_count', '<', this.maxAttempts)
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
      .where('trigger_attempt_count', '>=', this.maxAttempts)
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
      .where('trigger_attempt_count', '<', this.maxAttempts)
      .where((query) => {
        void query
          .whereNull('trigger_next_attempt_at')
          .orWhere('trigger_next_attempt_at', '<=', now)
      })
      .orderBy('trigger_next_attempt_at', 'asc')
      .orderBy('created_at', 'asc')
      .limit(this.reconciliationBatchSize)
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
        const dispatchResult = await this.dispatch(
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
      this.operationalLogger.log(
        'warn',
        buildReviewAiDisputeDispatchAmbiguousEvent({
          evaluationId,
          sourceTable,
          staleDispatchMs: this.staleDispatchMs,
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
        completed_at: this.now(),
      })
  }
}
