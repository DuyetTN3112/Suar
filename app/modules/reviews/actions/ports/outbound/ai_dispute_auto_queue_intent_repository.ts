import type { AiDisputeSourceType } from '../../../public_contracts/ai_dispute_auto_queue.js'
import type { ReviewActionContext } from '../../review_action_context.js'

export interface AiDisputeAutoQueueIntentJob {
  id: string
  sourceType: AiDisputeSourceType
  sourceId: string
  organizationId: string | null
  requestId: string | null
  traceId: string | null
  workflowId: string | null
  attemptCount: number
  leaseToken: string
}

export interface ClaimAiDisputeAutoQueueIntentsInput {
  workerId: string
  batchSize: number
  leaseMs: number
  now: Date
}

export interface ClaimAiDisputeAutoQueueIntentInput {
  workerId: string
  sourceType: AiDisputeSourceType
  sourceId: string
  leaseMs: number
  now: Date
}

export interface CompleteAiDisputeAutoQueueIntentInput {
  job: AiDisputeAutoQueueIntentJob
  now: Date
}

export interface FailAiDisputeAutoQueueIntentInput extends CompleteAiDisputeAutoQueueIntentInput {
  errorCode: string
  availableAt: Date | null
}

export interface AiDisputeAutoQueueIntentRepository {
  claimBatch(input: ClaimAiDisputeAutoQueueIntentsInput): Promise<AiDisputeAutoQueueIntentJob[]>
  claimSource(
    input: ClaimAiDisputeAutoQueueIntentInput
  ): Promise<AiDisputeAutoQueueIntentJob | null>
  hasEvaluation(sourceType: AiDisputeSourceType, sourceId: string): Promise<boolean>
  acknowledge(input: CompleteAiDisputeAutoQueueIntentInput): Promise<boolean>
  fail(input: FailAiDisputeAutoQueueIntentInput): Promise<boolean>
}

export type AiDisputeAutoQueueProcessor = (input: {
  disputeId: string
  sourceType: AiDisputeSourceType
  requestContext: ReviewActionContext
}) => Promise<void>
