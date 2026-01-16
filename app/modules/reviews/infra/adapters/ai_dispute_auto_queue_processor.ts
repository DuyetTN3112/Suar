import db from '@adonisjs/lucid/services/db'

import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import type { AiDisputeAutoQueueProcessor } from '#modules/reviews/actions/ports/outbound/ai_dispute_auto_queue_intent_repository'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'
import type { AiDisputeSourceType } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

// Infrastructure adapter for resolving the automation actor before delegating the use case.
const DEFAULT_PROVIDER = 'clawagent'
const ADMIN_ROLES = ['superadmin', 'system_admin']
const AUTO_QUEUE_SKIPPED_EVENT = 'review.dispute.ai_evaluation.auto_queue_skipped'
const AUTO_QUEUE_FAILED_EVENT = 'review.dispute.ai_evaluation.auto_queue_failed'

interface QueueAiDisputeEvaluationAfterReportInput {
  disputeId: string
  sourceType: AiDisputeSourceType
  requestContext: ReviewActionContext
}

export interface StartAutoQueuedAiDisputeEvaluationInput {
  actorId: string
  disputeId: string
  sourceType: AiDisputeSourceType
  provider: string
  requestContext: ReviewActionContext
}

export type StartAutoQueuedAiDisputeEvaluation = (
  input: StartAutoQueuedAiDisputeEvaluationInput
) => Promise<void>

async function findAutomationActorId(): Promise<string | null> {
  const envActorId = process.env['SUAR_AI_DISPUTE_AUTO_ACTOR_ID']
  if (envActorId && envActorId.trim().length > 0) {
    return envActorId.trim()
  }

  const actor = (await db
    .from('users')
    .whereIn('system_role', ADMIN_ROLES)
    .orderByRaw("CASE WHEN system_role = 'superadmin' THEN 0 ELSE 1 END")
    .orderBy('created_at', 'asc')
    .select('id')
    .first()) as { id: string } | undefined

  return actor?.id ?? null
}

async function hasExistingEvaluation(
  sourceType: AiDisputeSourceType,
  disputeId: string
): Promise<boolean> {
  const existing = (await db
    .from('ai_dispute_evaluations')
    .where('source_type', sourceType)
    .where('source_id', disputeId)
    .select('id')
    .first()) as { id: string } | undefined

  return Boolean(existing)
}

function logAutoQueueWarning(
  input: QueueAiDisputeEvaluationAfterReportInput,
  eventName: string,
  stage: 'skipped' | 'failed',
  error: unknown
): void {
  try {
    platformOperationalLogger.log(
      'warn',
      buildReviewDisputeEvent(input.requestContext, {
        eventName,
        eventFamily: 'dispute',
        subsystem: 'ai_dispute_auto_queue',
        workflow: 'review_dispute_ai_evaluation',
        stage,
        outcome: stage === 'skipped' ? 'warning' : 'failure',
        severity: 'warn',
        disputeId: input.disputeId,
        change: {
          source_type: input.sourceType,
          provider: process.env['SUAR_AI_DISPUTE_AUTO_PROVIDER'] ?? DEFAULT_PROVIDER,
        },
        error,
        retentionClass: 'transient_runtime',
      })
    )
  } catch {
    // Telemetry failure must not change the outcome of an already committed report.
  }
}

async function queueAiDisputeEvaluationAfterReport(
  input: QueueAiDisputeEvaluationAfterReportInput,
  startEvaluation: StartAutoQueuedAiDisputeEvaluation
): Promise<void> {
  try {
    if (await hasExistingEvaluation(input.sourceType, input.disputeId)) {
      return
    }

    const actorId = await findAutomationActorId()
    if (!actorId) {
      logAutoQueueWarning(
        input,
        AUTO_QUEUE_SKIPPED_EVENT,
        'skipped',
        new Error('No automation actor available')
      )
      return
    }

    await startEvaluation({
      actorId,
      disputeId: input.disputeId,
      provider: process.env['SUAR_AI_DISPUTE_AUTO_PROVIDER'] ?? DEFAULT_PROVIDER,
      sourceType: input.sourceType,
      requestContext: input.requestContext,
    })
  } catch (error) {
    logAutoQueueWarning(input, AUTO_QUEUE_FAILED_EVENT, 'failed', error)
    // Report delivery must not fail because the downstream AI queue is unavailable.
  }
}

export function createAiDisputeAutoQueueProcessor(
  startEvaluation: StartAutoQueuedAiDisputeEvaluation
): AiDisputeAutoQueueProcessor {
  return (input) => queueAiDisputeEvaluationAfterReport(input, startEvaluation)
}
