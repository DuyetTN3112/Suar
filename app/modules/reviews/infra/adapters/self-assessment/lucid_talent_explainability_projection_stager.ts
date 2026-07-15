import { createHash } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  stageDomainEvent,
  type StageDomainEventResult,
} from '#modules/events/public_contracts/domain_event_outbox'
import {
  buildTalentExplainabilityProjectionsV1,
  collectTalentExplainabilityProjectionUserIds,
} from '#modules/reviews/actions/mappers/talent_explainability_projection_mapper'
import { LucidTalentExplainabilityFactSourceReader } from '#modules/reviews/infra/adapters/review-core/lucid_review_fact_source_readers'
import type { TalentExplainabilityReviewProjectionV1 } from '#modules/reviews/public_contracts/talent_explainability_projection_v1'

async function loadTalentExplainabilityProjectionsV1(
  revieweeUserIds: string[],
  trx: TransactionClientContract
): Promise<TalentExplainabilityReviewProjectionV1[]> {
  const { uniqueUserIds, validUserIds } =
    collectTalentExplainabilityProjectionUserIds(revieweeUserIds)
  if (uniqueUserIds.length === 0) return []

  const source = await new LucidTalentExplainabilityFactSourceReader().load(validUserIds, trx)
  return buildTalentExplainabilityProjectionsV1(uniqueUserIds, source)
}

async function stageProjection(input: {
  trx: TransactionClientContract
  projection: TalentExplainabilityReviewProjectionV1
  sourceEventName:
    | 'review:submitted'
    | 'review_dispute:created'
    | 'flagged_review:resolved'
    | 'review:confirmed'
    | 'dispute:resolved'
    | 'backfill'
  sourceEventId: string
  occurredAt: string
}): Promise<StageDomainEventResult> {
  const { projection } = input
  return stageDomainEvent(input.trx, {
    eventName: 'reviews:talent-explainability-projection:changed:v1',
    dedupeKey: createHash('sha256')
      .update(`${input.sourceEventName}:${input.sourceEventId}:${projection.sourceRevision}`)
      .digest('hex'),
    aggregateType: 'user_talent',
    aggregateId: projection.revieweeUserId,
    payload: {
      ...projection,
      eventType: 'reviews.talent_explainability_projection_changed.v1',
      occurredAt: input.occurredAt,
    },
  })
}

export async function stageTalentExplainabilityProjectionV1(input: {
  trx: TransactionClientContract
  revieweeUserId: string
  sourceEventName:
    | 'review:submitted'
    | 'review_dispute:created'
    | 'flagged_review:resolved'
    | 'review:confirmed'
    | 'dispute:resolved'
    | 'backfill'
  sourceEventId: string
  occurredAt: string
}): Promise<StageDomainEventResult> {
  const projections = await loadTalentExplainabilityProjectionsV1([input.revieweeUserId], input.trx)
  const projection = projections[0]
  if (!projection) {
    throw new InvariantViolationException(
      'Talent explainability projection source did not return its reviewee'
    )
  }
  return stageProjection({
    ...input,
    projection,
  })
}

export async function stageTalentExplainabilityProjectionBackfillV1(input: {
  trx: TransactionClientContract
  revieweeUserIds: string[]
  occurredAt: string
}): Promise<number> {
  const uniqueUserIds = [...new Set(input.revieweeUserIds)].sort()
  const projections = await loadTalentExplainabilityProjectionsV1(uniqueUserIds, input.trx)
  if (projections.length !== uniqueUserIds.length) {
    throw new InvariantViolationException(
      'Talent explainability backfill did not return every requested reviewee'
    )
  }

  let staged = 0
  for (const projection of projections) {
    const result = await stageProjection({
      trx: input.trx,
      projection,
      sourceEventName: 'backfill',
      sourceEventId: projection.revieweeUserId,
      occurredAt: input.occurredAt,
    })
    if (result.staged) {
      staged += 1
    }
  }
  return staged
}
