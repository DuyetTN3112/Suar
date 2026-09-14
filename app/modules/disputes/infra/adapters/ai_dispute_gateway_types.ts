import type { PlatformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import type { ClawagentTriggerResult } from '#modules/disputes/infra/adapters/clawagent_dispute_client'

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

export interface AiDisputeReconciliationRow {
  id: string
  source_id: string
  trigger_source_table: string | null
  trigger_expected_source_status: string | null
  trigger_payload: unknown
}

export interface AiDisputeDispatchStateRow {
  status: string
  external_run_id: string | null
  error_message: string | null
  trigger_error_retryable: boolean | null
  trigger_attempt_count: number
  trigger_state: string
  trigger_dispatch_token: string | null
}

export const TERMINAL_EVALUATION_STATUSES = new Set(['completed', 'failed', 'cancelled'])
export const AI_DISPUTE_SOURCE_TABLES = new Set<AiDisputeSourceTable>([
  'review_disputes',
  'sprint_review_disputes',
  'sprint_reverse_review_workflows',
  'task_review_workflows',
])
export const DEFAULT_MAX_ATTEMPTS = 8
export const DEFAULT_RETRY_BASE_MS = 1_000
export const DEFAULT_RETRY_CAP_MS = 300_000
export const DEFAULT_STALE_DISPATCH_MS = 60_000
export const DEFAULT_RECONCILIATION_BATCH_SIZE = 25

export function configuredInteger(
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

export function requiredPositiveInteger(
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

export function isAiDisputeSourceTable(value: string): value is AiDisputeSourceTable {
  return AI_DISPUTE_SOURCE_TABLES.has(value as AiDisputeSourceTable)
}

export function parseTriggerPayload(value: unknown): Record<string, unknown> | null {
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

export function triggerErrorMessage(result: Extract<ClawagentTriggerResult, { ok: false }>): string {
  return `${result.code}: ${result.diagnostic}`
}

export function toDispatchResult(
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
