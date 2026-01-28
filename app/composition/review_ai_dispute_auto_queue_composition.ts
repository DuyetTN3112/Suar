import { randomUUID } from 'node:crypto'

import { reviewActionFactory } from '#composition/review_action_factory'
import { ProcessAiDisputeAutoQueueIntentsCommand } from '#modules/reviews/actions/commands/process_ai_dispute_auto_queue_intents_command'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { createAiDisputeAutoQueueProcessor } from '#modules/reviews/infra/adapters/ai_dispute_auto_queue_processor'
import {
  PostgresAiDisputeAutoQueueIntentRepository,
  stageAiDisputeAutoQueueIntent,
} from '#modules/reviews/infra/repositories/postgres_ai_dispute_auto_queue_intent_repository'
import type { AiDisputeAutoQueueCapability } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

function configuredInteger(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback

  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
  return value
}

export const processAiDisputeAutoQueueIntentsCommand = new ProcessAiDisputeAutoQueueIntentsCommand(
  new PostgresAiDisputeAutoQueueIntentRepository(),
  createAiDisputeAutoQueueProcessor(async (input) => {
    await reviewActionFactory
      .makeStartAiDisputeEvaluationCommand({
        ...makeSystemReviewActionContext(input.actorId),
        ip: input.requestContext.ip,
        userAgent: 'system:ai-dispute-auto-queue',
        organizationId: input.requestContext.organizationId,
        requestId: input.requestContext.requestId ?? null,
        traceId: input.requestContext.traceId ?? null,
        workflowId: input.requestContext.workflowId ?? null,
      })
      .execute({
        dispute_id: input.disputeId,
        provider: input.provider,
        source_type: input.sourceType,
      })
  }),
  {
    batchSize: configuredInteger('CLAWAGENT_AUTO_QUEUE_BATCH_SIZE', 25, 1, 100),
    leaseMs: configuredInteger('CLAWAGENT_AUTO_QUEUE_LEASE_MS', 60_000, 5_000, 600_000),
    maxAttempts: configuredInteger('CLAWAGENT_AUTO_QUEUE_MAX_ATTEMPTS', 12, 1, 100),
    retryBaseMs: configuredInteger('CLAWAGENT_AUTO_QUEUE_RETRY_BASE_MS', 5_000, 100, 3_600_000),
    retryCapMs: configuredInteger('CLAWAGENT_AUTO_QUEUE_RETRY_CAP_MS', 300_000, 100, 86_400_000),
  }
)

export const aiDisputeAutoQueueCapability: AiDisputeAutoQueueCapability = {
  stage(transaction, input) {
    return stageAiDisputeAutoQueueIntent(transaction as never, input)
  },
  async processAfterReport(sourceType, sourceId) {
    await processAiDisputeAutoQueueIntentsCommand.executeSource(
      sourceType,
      sourceId,
      `ai-dispute-auto-queue-immediate-${randomUUID()}`
    )
  },
}
