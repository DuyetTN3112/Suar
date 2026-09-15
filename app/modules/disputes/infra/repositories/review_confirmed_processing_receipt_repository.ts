import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  assertValidTimestamp,
  canonicalJson,
  loadCurrent,
  loadForUpdate,
  payloadFingerprint,
  RECEIPT_LOCK_TIMEOUT,
  assertSameClaim,
  TABLE,
  toReceipt,
  type ReceiptDatabaseRow,
} from './review_confirmed_processing_receipt_codec.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  buildReviewConfirmedExternalEffectPlan,
  parseClaimReviewConfirmedReceiptInput,
  parseReviewConfirmedExternalEffects,
  parseReviewConfirmedReceiptErrorCode,
  ReviewConfirmedReceiptCollisionException,
  type AdvanceReviewConfirmedExternalEffectInput,
  type AdvanceReviewConfirmedExternalEffectResult,
  type ClaimReviewConfirmedReceiptInput,
  type ClaimReviewConfirmedReceiptResult,
  type ReviewConfirmedExternalEffects,
  type ReviewConfirmedProcessingReceipt,
} from '#modules/reviews/public_contracts/review_confirmed_processing_receipt'

export class ReviewConfirmedProcessingReceiptRepository {
  async claimOrLoadDatabaseApplied(
    trx: TransactionClientContract,
    unsafeInput: ClaimReviewConfirmedReceiptInput
  ): Promise<ClaimReviewConfirmedReceiptResult> {
    const input = parseClaimReviewConfirmedReceiptInput(unsafeInput)
    const fingerprint = payloadFingerprint(input)
    await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [RECEIPT_LOCK_TIMEOUT])

    const insertedRows = (await trx
      .table(TABLE)
      .insert({
        confirmation_id: input.payload.confirmationId,
        payload_fingerprint: fingerprint,
        event_version: input.eventVersion,
        review_session_id: input.payload.reviewSessionId,
        reviewee_id: input.payload.revieweeId,
        reviewer_ids: JSON.stringify(input.payload.reviewerIds),
        confirmed_by: input.payload.confirmedBy,
        action: input.payload.action,
      })
      .onConflict('confirmation_id')
      .ignore()
      .returning('*')) as ReceiptDatabaseRow[]

    const inserted = insertedRows[0]
    if (inserted) {
      return { inserted: true, receipt: toReceipt(inserted) }
    }

    const existing = await loadForUpdate(trx, input.payload.confirmationId)
    if (!existing) {
      throw new InvariantViolationException(
        'Review confirmed receipt conflict did not resolve to a durable row'
      )
    }
    const receipt = toReceipt(existing)
    if (receipt.externalEffects === null || receipt.externalEffectsSavedAt === null) {
      throw new InvariantViolationException(
        'Committed review confirmed receipt is missing stable external effects'
      )
    }
    assertSameClaim(receipt, input, fingerprint)
    return { inserted: false, receipt }
  }

  async saveExternalEffects(
    trx: TransactionClientContract,
    confirmationId: string,
    unsafeEffects: ReviewConfirmedExternalEffects,
    now: Date = new Date()
  ): Promise<ReviewConfirmedProcessingReceipt> {
    assertValidTimestamp(now)
    const effects = parseReviewConfirmedExternalEffects(unsafeEffects)
    const existingRow = await loadForUpdate(trx, confirmationId)
    if (!existingRow) {
      throw new InvariantViolationException(
        'Cannot save external effects for a missing review confirmed receipt'
      )
    }
    const externalEffectTotal = buildReviewConfirmedExternalEffectPlan(
      existingRow.reviewee_id,
      effects
    ).length
    const existing = toReceipt(existingRow)
    if (existing.externalEffects !== null) {
      if (canonicalJson(existing.externalEffects) !== canonicalJson(effects)) {
        throw new ReviewConfirmedReceiptCollisionException(confirmationId, 'external_effects')
      }
      return existing
    }

    const rows = (await trx
      .from(TABLE)
      .where('confirmation_id', confirmationId)
      .whereNull('external_effects_saved_at')
      .update({
        external_effects: effects,
        external_effects_saved_at: now,
        external_effect_total: externalEffectTotal,
        updated_at: now,
      })
      .returning('*')) as ReceiptDatabaseRow[]
    const updated = rows[0]
    if (!updated) {
      throw new InvariantViolationException(
        'Review confirmed receipt external effects update lost its row lock'
      )
    }
    return toReceipt(updated)
  }

  async markCompleted(
    confirmationId: string,
    now: Date = new Date()
  ): Promise<ReviewConfirmedProcessingReceipt> {
    assertValidTimestamp(now)
    const existing = await loadCurrent(confirmationId)
    if (!existing) {
      throw new InvariantViolationException('Cannot complete a missing review confirmed receipt')
    }
    const receipt = toReceipt(existing)
    if (
      receipt.externalEffects === null ||
      receipt.externalEffectTotal === null ||
      receipt.externalEffectCursor < receipt.externalEffectTotal
    ) {
      throw new InvariantViolationException(
        'Cannot complete a review confirmed receipt before every external effect checkpoint'
      )
    }
    return receipt
  }

  async advanceExternalEffectCursor(
    input: AdvanceReviewConfirmedExternalEffectInput
  ): Promise<AdvanceReviewConfirmedExternalEffectResult> {
    const now = input.now ?? new Date()
    assertValidTimestamp(now)
    if (
      !Number.isSafeInteger(input.expectedCursor) ||
      input.expectedCursor < 0 ||
      input.expectedCursor > 1001
    ) {
      throw new RangeError('Review confirmed expected external effect cursor is invalid')
    }

    return db.transaction(async (trx) => {
      await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [RECEIPT_LOCK_TIMEOUT])
      const row = await loadForUpdate(trx, input.confirmationId)
      if (!row) {
        throw new InvariantViolationException('Cannot advance a missing review confirmed receipt')
      }
      const receipt = toReceipt(row)
      if (!receipt.externalEffects || receipt.externalEffectTotal === null) {
        throw new InvariantViolationException(
          'Cannot advance a review confirmed receipt without a durable effect plan'
        )
      }
      const plan = buildReviewConfirmedExternalEffectPlan(
        receipt.revieweeId,
        receipt.externalEffects
      )
      const expectedEffect = plan[input.expectedCursor]
      if (!expectedEffect || expectedEffect.key !== input.expectedEffectKey) {
        throw new ReviewConfirmedReceiptCollisionException(
          input.confirmationId,
          'external_effect_key'
        )
      }
      if (receipt.externalEffectCursor > input.expectedCursor) {
        return { advanced: false, receipt }
      }
      if (receipt.externalEffectCursor < input.expectedCursor) {
        throw new ReviewConfirmedReceiptCollisionException(
          input.confirmationId,
          'external_effect_cursor'
        )
      }

      const nextCursor = input.expectedCursor + 1
      const completed = nextCursor === receipt.externalEffectTotal
      const rows = (await trx
        .from(TABLE)
        .where('confirmation_id', input.confirmationId)
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
        .returning('*')) as ReceiptDatabaseRow[]
      const updated = rows[0]
      if (!updated) {
        throw new InvariantViolationException(
          'Review confirmed effect cursor compare-and-set lost its row lock'
        )
      }
      return { advanced: true, receipt: toReceipt(updated) }
    })
  }

  async recordExternalFailure(
    confirmationId: string,
    unsafeErrorCode: string,
    now: Date = new Date()
  ): Promise<ReviewConfirmedProcessingReceipt> {
    assertValidTimestamp(now)
    const errorCode = parseReviewConfirmedReceiptErrorCode(unsafeErrorCode)
    const rows: { rows?: ReceiptDatabaseRow[] } = await db.rawQuery(
      `
        UPDATE ${TABLE}
        SET
          external_attempt_count = external_attempt_count + 1,
          last_external_error_code = ?,
          last_external_failed_at = ?,
          updated_at = ?
        WHERE confirmation_id = ?
          AND state = 'database_applied'
          AND external_effects_saved_at IS NOT NULL
        RETURNING *
      `,
      [errorCode, now, now, confirmationId]
    )
    const updated = rows.rows?.[0]
    if (updated) return toReceipt(updated)

    const existing = await loadCurrent(confirmationId)
    if (!existing) {
      throw new InvariantViolationException(
        'Cannot record external failure for a missing review confirmed receipt'
      )
    }
    return toReceipt(existing)
  }
}

export const reviewConfirmedProcessingReceiptRepository =
  new ReviewConfirmedProcessingReceiptRepository()
