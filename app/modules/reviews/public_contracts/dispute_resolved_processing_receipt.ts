import { z } from 'zod'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { DisputeResolvedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'
import type {
  ReviewConfirmedExternalEffects,
  ReviewConfirmedExternalEffectCheckpoint,
} from '#modules/reviews/public_contracts/review_confirmed_processing_receipt'

const identifierSchema = z.string().trim().min(1).max(255)

const disputeResolvedPayloadSchema = z
  .object({
    disputeId: identifierSchema,
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
    resolvedBy: identifierSchema,
    finalDecision: z.enum([
      'uphold_review',
      'adjust_score',
      'request_re_review',
      'dismiss_dispute',
      'partially_accept',
    ]),
    profileUpdateAction: z
      .enum(['recalculate_after_adjustment', 'no_action'])
      .nullable()
      .optional(),
    reviewerCredibilityAction: z
      .enum(['mark_disputed_review', 'no_action'])
      .nullable()
      .optional(),
  })
  .strict()

export type DisputeResolvedReceiptState = 'database_applied' | 'completed'

export interface DisputeResolvedProcessingReceipt {
  disputeId: string
  payloadFingerprint: string
  eventVersion: 1
  payload: DisputeResolvedOutboxPayload
  state: DisputeResolvedReceiptState
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

export interface ClaimDisputeResolvedReceiptResult {
  inserted: boolean
  receipt: DisputeResolvedProcessingReceipt
}

export interface AdvanceDisputeResolvedExternalEffectInput {
  disputeId: string
  expectedCursor: number
  expectedEffectKey: ReviewConfirmedExternalEffectCheckpoint['key']
  now?: Date
}

export interface AdvanceDisputeResolvedExternalEffectResult {
  advanced: boolean
  receipt: DisputeResolvedProcessingReceipt
}

export class DisputeResolvedReceiptCollisionException extends InvariantViolationException {
  constructor(disputeId: string, reason: string) {
    super('Dispute resolved receipt identity was reused with different durable data', {
      details: { disputeId, reason, permanent: true },
    })
    this.name = 'DisputeResolvedReceiptCollisionException'
  }
}

export function parseDisputeResolvedReceiptPayload(
  payload: DisputeResolvedOutboxPayload
): DisputeResolvedOutboxPayload {
  return disputeResolvedPayloadSchema.parse(payload)
}
