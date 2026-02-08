import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export type AiDisputeSourceType =
  | 'review_dispute'
  | 'sprint_review_dispute'
  | 'sprint_reverse_review_workflow'
  | 'task_review_workflow'

export interface StageAiDisputeAutoQueueIntentInput {
  sourceType: AiDisputeSourceType
  sourceId: string
  requestContext: {
    userId: string | null
    ip: string
    userAgent: string
    organizationId: string | null
    requestId?: string | null
    traceId?: string | null
    workflowId?: string | null
  }
}

export interface AiDisputeAutoQueueCapability {
  stage(transaction: object, input: StageAiDisputeAutoQueueIntentInput): Promise<void>
  processAfterReport(
    sourceType: StageAiDisputeAutoQueueIntentInput['sourceType'],
    sourceId: string
  ): Promise<void>
}

let provider: AiDisputeAutoQueueCapability | null = null

export function registerAiDisputeAutoQueueCapability(
  implementation: AiDisputeAutoQueueCapability
): void {
  provider = implementation
}

function requireProvider(): AiDisputeAutoQueueCapability {
  if (!provider) {
    throw new InvariantViolationException('AI dispute auto-queue capability is not configured')
  }
  return provider
}

export const aiDisputeAutoQueuePublicApi: AiDisputeAutoQueueCapability = {
  stage(transaction, input) {
    return requireProvider().stage(transaction, input)
  },
  processAfterReport(sourceType, sourceId) {
    return requireProvider().processAfterReport(sourceType, sourceId)
  },
}
