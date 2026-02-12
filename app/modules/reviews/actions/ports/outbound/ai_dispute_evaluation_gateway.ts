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

/**
 * Technical reliability boundary for durable AI-dispute dispatch.
 *
 * The command owns the use-case decision; the implementation owns leases,
 * transactions, idempotency fencing and the concrete provider client.
 */
export interface AiDisputeEvaluationGateway {
  stage(input: StageAiDisputeEvaluationInput): Promise<StagedAiDisputeEvaluation>

  dispatch(
    input: DispatchAiDisputeEvaluationInput,
    signal?: AbortSignal
  ): Promise<DispatchAiDisputeEvaluationResult>

  reconcileOnce(signal?: AbortSignal): Promise<AiDisputeReconciliationResult>
}
