import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  LOCK_TIMEOUT,
  TABLE,
  assertSamePayload,
  canonicalJson,
  fingerprint,
  loadForUpdate,
  toReceipt,
  validNow,
  type ReceiptRow,
} from './dispute_resolved_processing_receipt_codec.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { DisputeResolvedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'
import {
  DisputeResolvedReceiptCollisionException,
  parseDisputeResolvedReceiptPayload,
  type AdvanceDisputeResolvedExternalEffectInput,
  type AdvanceDisputeResolvedExternalEffectResult,
  type ClaimDisputeResolvedReceiptResult,
  type DisputeResolvedProcessingReceipt,
} from '#modules/disputes/public_contracts/dispute_resolved_processing_receipt'
import {
  buildReviewConfirmedExternalEffectPlan,
  parseReviewConfirmedExternalEffects,
  parseReviewConfirmedReceiptErrorCode,
  type ReviewConfirmedExternalEffects,
} from '#modules/reviews/public_contracts/review_confirmed_processing_receipt'

export class DisputeResolvedProcessingReceiptRepository {
  async claimOrLoadDatabaseApplied(
    trx: TransactionClientContract,
    unsafePayload: DisputeResolvedOutboxPayload
  ): Promise<ClaimDisputeResolvedReceiptResult> {
    const payload = parseDisputeResolvedReceiptPayload(unsafePayload)
    const payloadFingerprint = fingerprint(payload)
    await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [LOCK_TIMEOUT])
    const rows = (await trx
      .table(TABLE)
      .insert({
        dispute_id: payload.disputeId,
        payload_fingerprint: payloadFingerprint,
        event_version: 1,
        payload,
      })
      .onConflict('dispute_id')
      .ignore()
      .returning('*')) as ReceiptRow[]
    if (rows[0]) return { inserted: true, receipt: toReceipt(rows[0]) }

    const existing = await loadForUpdate(trx, payload.disputeId)
    if (!existing) {
      throw new InvariantViolationException(
        'Dispute resolved receipt conflict did not resolve to a durable row'
      )
    }
    const receipt = toReceipt(existing)
    if (!receipt.externalEffects || !receipt.externalEffectsSavedAt) {
      throw new InvariantViolationException(
        'Committed dispute resolved receipt is missing stable effects'
      )
    }
    assertSamePayload(receipt, payload, payloadFingerprint)
    return { inserted: false, receipt }
  }

  async saveExternalEffects(
    trx: TransactionClientContract,
    disputeId: string,
    unsafeEffects: ReviewConfirmedExternalEffects,
    now: Date = new Date()
  ): Promise<DisputeResolvedProcessingReceipt> {
    validNow(now)
    const effects = parseReviewConfirmedExternalEffects(unsafeEffects)
    const row = await loadForUpdate(trx, disputeId)
    if (!row) {
      throw new InvariantViolationException(
        'Cannot save effects for a missing dispute resolved receipt'
      )
    }
    const existing = toReceipt(row)
    if (existing.externalEffects) {
      if (canonicalJson(existing.externalEffects) !== canonicalJson(effects)) {
        throw new DisputeResolvedReceiptCollisionException(
          disputeId,
          'external_effects'
        )
      }
      return existing
    }
    const total = buildReviewConfirmedExternalEffectPlan(
      existing.payload.revieweeId,
      effects
    ).length
    const rows = (await trx
      .from(TABLE)
      .where('dispute_id', disputeId)
      .whereNull('external_effects_saved_at')
      .update({
        external_effects: effects,
        external_effects_saved_at: now,
        external_effect_total: total,
        updated_at: now,
      })
      .returning('*')) as ReceiptRow[]
    if (!rows[0]) {
      throw new InvariantViolationException(
        'Dispute resolved effect plan update lost its row lock'
      )
    }
    return toReceipt(rows[0])
  }

  async advanceExternalEffectCursor(
    input: AdvanceDisputeResolvedExternalEffectInput
  ): Promise<AdvanceDisputeResolvedExternalEffectResult> {
    const now = input.now ?? new Date()
    validNow(now)
    if (
      !Number.isSafeInteger(input.expectedCursor) ||
      input.expectedCursor < 0 ||
      input.expectedCursor > 1001
    ) {
      throw new RangeError('Dispute resolved expected effect cursor is invalid')
    }
    return db.transaction(async (trx) => {
      await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [LOCK_TIMEOUT])
      const row = await loadForUpdate(trx, input.disputeId)
      if (!row) {
        throw new InvariantViolationException(
          'Cannot advance a missing dispute resolved receipt'
        )
      }
      const receipt = toReceipt(row)
      if (!receipt.externalEffects || receipt.externalEffectTotal === null) {
        throw new InvariantViolationException(
          'Cannot advance a dispute resolved receipt without an effect plan'
        )
      }
      const plan = buildReviewConfirmedExternalEffectPlan(
        receipt.payload.revieweeId,
        receipt.externalEffects
      )
      const expectedEffect = plan[input.expectedCursor]
      if (!expectedEffect || expectedEffect.key !== input.expectedEffectKey) {
        throw new DisputeResolvedReceiptCollisionException(
          input.disputeId,
          'external_effect_key'
        )
      }
      if (receipt.externalEffectCursor > input.expectedCursor) {
        return { advanced: false, receipt }
      }
      if (receipt.externalEffectCursor < input.expectedCursor) {
        throw new DisputeResolvedReceiptCollisionException(
          input.disputeId,
          'external_effect_cursor'
        )
      }
      const nextCursor = input.expectedCursor + 1
      const completed = nextCursor === receipt.externalEffectTotal
      const rows = (await trx
        .from(TABLE)
        .where('dispute_id', input.disputeId)
        .where('external_effect_cursor', input.expectedCursor)
        .where('state', 'database_applied')
        .update({
          external_effect_cursor: nextCursor,
          ...(completed
            ? {
                state: 'completed',
                completed_at: now,
                last_external_error_code: null,
              }
            : {}),
          updated_at: now,
        })
        .returning('*')) as ReceiptRow[]
      if (!rows[0]) {
        throw new InvariantViolationException(
          'Dispute resolved effect cursor compare-and-set lost its row lock'
        )
      }
      return { advanced: true, receipt: toReceipt(rows[0]) }
    })
  }

  async recordExternalFailure(
    disputeId: string,
    unsafeErrorCode: string,
    now: Date = new Date()
  ): Promise<DisputeResolvedProcessingReceipt> {
    validNow(now)
    const errorCode = parseReviewConfirmedReceiptErrorCode(unsafeErrorCode)
    const result: { rows?: ReceiptRow[] } = await db.rawQuery(
      `
        UPDATE ${TABLE}
        SET
          external_attempt_count = external_attempt_count + 1,
          last_external_error_code = ?,
          last_external_failed_at = ?,
          updated_at = ?
        WHERE dispute_id = ?
          AND state = 'database_applied'
          AND external_effects_saved_at IS NOT NULL
        RETURNING *
      `,
      [errorCode, now, now, disputeId]
    )
    const row = result.rows?.[0]
    if (row) return toReceipt(row)
    const existing = (await db
      .from(TABLE)
      .where('dispute_id', disputeId)
      .first()) as ReceiptRow | undefined
    if (!existing) {
      throw new InvariantViolationException(
        'Cannot record failure for a missing dispute resolved receipt'
      )
    }
    return toReceipt(existing)
  }
}

export const disputeResolvedProcessingReceiptRepository =
  new DisputeResolvedProcessingReceiptRepository()
