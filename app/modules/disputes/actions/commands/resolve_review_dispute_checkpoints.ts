import type { ResolveReviewDisputeDTO } from './resolve_review_dispute_command.js'

import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import { platformWorkflowLogger } from '#modules/observability/public_contracts/platform_observability'
import type { ReviewDisputeResult } from '#modules/disputes/actions/commands/create_review_dispute_command'
import type {
  ReviewDisputeResolutionPersistenceSession,
  ReviewDisputeResolutionSourceType,
} from '#modules/disputes/actions/ports/outbound/review_dispute_resolution_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'


export async function writeResolutionAudit(
  execCtx: ReviewActionContext,
  persistence: ReviewDisputeResolutionPersistenceSession,
  entityType: ReviewDisputeResolutionSourceType,
  dto: ResolveReviewDisputeDTO,
  actorId: string
): Promise<void> {
  await persistence.writeAudit(execCtx, {
    entityType,
    entityId: dto.dispute_id,
    actorId,
    finalDecision: dto.final_decision,
    profileUpdateAction: dto.profile_update_action ?? null,
    reviewerCredibilityAction: dto.reviewer_credibility_action ?? null,
  })
}

export async function writeResolutionCheckpoint(
  execCtx: ReviewActionContext,
  dto: ResolveReviewDisputeDTO,
  startedAt: number,
  metadata: Record<string, unknown>
): Promise<void> {
  await platformWorkflowLogger.checkpointSafely(
    execCtx,
    buildReviewDisputeEvent(execCtx, {
      eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESOLVED,
      eventFamily: 'dispute',
      subsystem: 'review_disputes',
      workflow: 'review_dispute_resolve',
      stage: 'completed',
      outcome: 'success',
      disputeId: dto.dispute_id,
      change: {
        final_decision: dto.final_decision,
        ...metadata,
      },
      runtime: {
        duration_ms: Date.now() - startedAt,
      },
    })
  )
}

export async function writeClassicResolutionCheckpoint(
  execCtx: ReviewActionContext,
  dto: ResolveReviewDisputeDTO,
  startedAt: number,
  result: ReviewDisputeResult
): Promise<void> {
  await platformWorkflowLogger.checkpointSafely(
    execCtx,
    buildReviewDisputeEvent(execCtx, {
      eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESOLVED,
      eventFamily: 'dispute',
      subsystem: 'review_disputes',
      workflow: 'review_dispute_resolve',
      stage: 'completed',
      outcome: 'success',
      disputeId: result.id,
      reviewSessionId: result.review_session_id,
      revieweeId: result.reviewee_id,
      change: {
        final_decision: dto.final_decision,
        profile_update_action: dto.profile_update_action ?? null,
        reviewer_credibility_action: dto.reviewer_credibility_action ?? null,
      },
      runtime: {
        duration_ms: Date.now() - startedAt,
      },
    })
  )
}

export async function writeAlternativeResolutionCheckpoint(
  execCtx: ReviewActionContext,
  dto: ResolveReviewDisputeDTO,
  startedAt: number,
  result: ReviewDisputeResult
): Promise<void> {
  const resolved = result as unknown as Record<string, unknown>
  await writeResolutionCheckpoint(execCtx, dto, startedAt, {
    source_type: resolved['source_type'],
    dispute_review_type: resolved['dispute_review_type'] ?? null,
  })
}
