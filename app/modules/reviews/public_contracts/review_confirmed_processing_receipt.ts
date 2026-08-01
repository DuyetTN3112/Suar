import { z } from 'zod'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { ReviewConfirmedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'

const identifierSchema = z.string().trim().min(1).max(255)
const safeErrorCodeSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_.:-]+$/)

const reviewConfirmedPayloadSchema = z
  .object({
    confirmationId: identifierSchema,
    reviewSessionId: identifierSchema,
    revieweeId: identifierSchema,
    reviewerIds: z
      .array(identifierSchema)
      .max(500)
      .refine((values) => new Set(values).size === values.length, {
        message: 'reviewerIds must not contain duplicates',
      })
      .refine(
        (values) =>
          values.every(
            (value, index) => index === 0 || (values[index - 1] ?? '').localeCompare(value) < 0
          ),
        { message: 'reviewerIds must be in canonical ascending order' }
      ),
    confirmedBy: identifierSchema,
    action: z.enum(['confirmed', 'disputed']),
  })
  .strict()

const skillScoreUpdatedEffectSchema = z
  .object({
    userId: identifierSchema,
    skillId: identifierSchema,
    oldScore: z.number().nullable(),
    newScore: z.number(),
  })
  .strict()

const talentProjectionEffectSchema = z
  .object({
    contractVersion: z.literal(1),
    eventType: z.literal('reviews.talent_explainability_projection_changed.v1'),
    revieweeUserId: identifierSchema,
    underDisputeSkillsCount: z.number().int().nonnegative(),
    latestConfidenceSignal: z.enum(['low', 'medium', 'high']).nullable(),
    sourceRevision: identifierSchema,
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const reviewConfirmedExternalEffectsSchema = z
  .object({
    version: z.literal(1),
    skillScoreUpdated: z.array(skillScoreUpdatedEffectSchema).max(1_000),
    talentProjection: talentProjectionEffectSchema.nullable(),
  })
  .strict()
  .refine((value) => Buffer.byteLength(JSON.stringify(value), 'utf8') <= 512 * 1_024, {
    message: 'review confirmed external effects must not exceed 512 KiB',
  })

export type ReviewConfirmedExternalEffects = z.output<
  typeof reviewConfirmedExternalEffectsSchema
>
export type ReviewConfirmedReceiptState = 'database_applied' | 'completed'
export type ReviewConfirmedSkillScoreUpdatedEffect =
  ReviewConfirmedExternalEffects['skillScoreUpdated'][number]
export type ReviewConfirmedTalentProjectionEffect = NonNullable<
  ReviewConfirmedExternalEffects['talentProjection']
>

export type ReviewConfirmedExternalEffectCheckpoint =
  | {
      ordinal: number
      key: `skill_score_updated:${number}`
      kind: 'skill_score_updated'
      payload: ReviewConfirmedSkillScoreUpdatedEffect
    }
  | {
      ordinal: number
      key: 'profile_review_cache_invalidation'
      kind: 'profile_review_cache_invalidation'
      payload: { revieweeId: string }
    }
  | {
      ordinal: number
      key: 'talent_projection'
      kind: 'talent_projection'
      payload: ReviewConfirmedTalentProjectionEffect
    }

export interface ReviewConfirmedProcessingReceipt {
  confirmationId: string
  payloadFingerprint: string
  eventVersion: 1
  reviewSessionId: string
  revieweeId: string
  reviewerIds: string[]
  confirmedBy: string
  action: 'confirmed' | 'disputed'
  state: ReviewConfirmedReceiptState
  externalEffects: ReviewConfirmedExternalEffects | null
  externalEffectsSavedAt: Date | null
  externalEffectCursor: number
  externalEffectTotal: number | null
  databaseAppliedAt: Date
  completedAt: Date | null
  externalAttemptCount: number
  lastExternalErrorCode: string | null
  lastExternalFailedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ClaimReviewConfirmedReceiptInput {
  eventVersion: 1
  payload: ReviewConfirmedOutboxPayload
}

export interface ClaimReviewConfirmedReceiptResult {
  inserted: boolean
  receipt: ReviewConfirmedProcessingReceipt
}

export interface AdvanceReviewConfirmedExternalEffectInput {
  confirmationId: string
  expectedCursor: number
  expectedEffectKey: ReviewConfirmedExternalEffectCheckpoint['key']
  now?: Date
}

export interface AdvanceReviewConfirmedExternalEffectResult {
  advanced: boolean
  receipt: ReviewConfirmedProcessingReceipt
}

export class ReviewConfirmedReceiptCollisionException extends InvariantViolationException {
  constructor(confirmationId: string, reason: string) {
    super('Review confirmed receipt identity was reused with different durable data', {
      details: { confirmationId, reason, permanent: true },
    })
    this.name = 'ReviewConfirmedReceiptCollisionException'
  }
}

export function parseClaimReviewConfirmedReceiptInput(
  input: ClaimReviewConfirmedReceiptInput
): ClaimReviewConfirmedReceiptInput {
  return z
    .object({
      eventVersion: z.literal(1),
      payload: reviewConfirmedPayloadSchema,
    })
    .strict()
    .parse(input)
}

export function parseReviewConfirmedExternalEffects(
  effects: ReviewConfirmedExternalEffects
): ReviewConfirmedExternalEffects {
  return reviewConfirmedExternalEffectsSchema.parse(effects)
}

export function parseReviewConfirmedReceiptErrorCode(errorCode: string): string {
  return safeErrorCodeSchema.parse(errorCode)
}

export function buildReviewConfirmedExternalEffectPlan(
  revieweeId: string,
  unsafeEffects: ReviewConfirmedExternalEffects
): ReviewConfirmedExternalEffectCheckpoint[] {
  const parsedRevieweeId = identifierSchema.parse(revieweeId)
  const effects = parseReviewConfirmedExternalEffects(unsafeEffects)
  const plan: ReviewConfirmedExternalEffectCheckpoint[] = effects.skillScoreUpdated.map(
    (effect, ordinal) => ({
      ordinal,
      key: `skill_score_updated:${ordinal}`,
      kind: 'skill_score_updated',
      payload: effect,
    })
  )
  plan.push({
    ordinal: plan.length,
    key: 'profile_review_cache_invalidation',
    kind: 'profile_review_cache_invalidation',
    payload: { revieweeId: parsedRevieweeId },
  })
  if (effects.talentProjection) {
    plan.push({
      ordinal: plan.length,
      key: 'talent_projection',
      kind: 'talent_projection',
      payload: effects.talentProjection,
    })
  }
  return plan
}
