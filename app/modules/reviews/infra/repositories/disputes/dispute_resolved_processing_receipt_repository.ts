import { createHash } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { DisputeResolvedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'
import {
  DisputeResolvedReceiptCollisionException,
  parseDisputeResolvedReceiptPayload,
  type AdvanceDisputeResolvedExternalEffectInput,
  type AdvanceDisputeResolvedExternalEffectResult,
  type ClaimDisputeResolvedReceiptResult,
  type DisputeResolvedProcessingReceipt,
} from '#modules/reviews/public_contracts/dispute_resolved_processing_receipt'
import {
  buildReviewConfirmedExternalEffectPlan,
  parseReviewConfirmedExternalEffects,
  parseReviewConfirmedReceiptErrorCode,
  type ReviewConfirmedExternalEffects,
} from '#modules/reviews/public_contracts/review_confirmed_processing_receipt'

interface ReceiptRow {
  dispute_id: string
  payload_fingerprint: string
  event_version: number | string
  payload: unknown
  state: 'database_applied' | 'completed'
  external_effects: unknown
  external_effects_saved_at: Date | string | null
  external_effect_cursor: number | string
  external_effect_total: number | string | null
  database_applied_at: Date | string
  completed_at: Date | string | null
  external_attempt_count: number | string
  last_external_error_code: string | null
  last_external_failed_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

const TABLE = 'dispute_resolved_processing_receipts'
const LOCK_TIMEOUT = '5000ms'

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`
}

function fingerprint(payload: DisputeResolvedOutboxPayload): string {
  return createHash('sha256')
    .update(canonicalJson({ eventVersion: 1, payload }))
    .digest('hex')
}

function validDate(value: Date | string | null, field: string): Date | null {
  if (value === null) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new InvariantViolationException(
      `Dispute resolved receipt has an invalid ${field}`
    )
  }
  return date
}

function requiredDate(value: Date | string, field: string): Date {
  const date = validDate(value, field)
  if (!date) {
    throw new InvariantViolationException(
      `Dispute resolved receipt is missing ${field}`
    )
  }
  return date
}

function emptyObject(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  )
}

function storedEffects(
  value: unknown,
  savedAt: Date | string | null
): ReviewConfirmedExternalEffects | null {
  if (savedAt === null && emptyObject(value)) return null
  try {
    return parseReviewConfirmedExternalEffects(value as ReviewConfirmedExternalEffects)
  } catch (error) {
    throw new InvariantViolationException(
      'Dispute resolved receipt contains malformed external effects',
      { cause: error }
    )
  }
}

function toReceipt(row: ReceiptRow): DisputeResolvedProcessingReceipt {
  if (Number(row.event_version) !== 1) {
    throw new InvariantViolationException(
      'Dispute resolved receipt contains an unsupported event version'
    )
  }
  const payload = parseDisputeResolvedReceiptPayload(
    row.payload as DisputeResolvedOutboxPayload
  )
  if (payload.disputeId !== row.dispute_id) {
    throw new InvariantViolationException(
      'Dispute resolved receipt payload identity does not match its key'
    )
  }
  const effectsSavedAt = validDate(
    row.external_effects_saved_at,
    'external effects timestamp'
  )
  const externalEffects = storedEffects(row.external_effects, effectsSavedAt)
  const cursor = Number(row.external_effect_cursor)
  const total =
    row.external_effect_total === null ? null : Number(row.external_effect_total)
  const attempts = Number(row.external_attempt_count)
  if (
    !Number.isSafeInteger(cursor) ||
    cursor < 0 ||
    !Number.isSafeInteger(attempts) ||
    attempts < 0 ||
    (total !== null &&
      (!Number.isSafeInteger(total) || total < 1 || cursor > total))
  ) {
    throw new InvariantViolationException(
      'Dispute resolved receipt contains invalid counters'
    )
  }
  if (!externalEffects) {
    if (cursor !== 0 || total !== null || row.state !== 'database_applied') {
      throw new InvariantViolationException(
        'Dispute resolved receipt has checkpoints before its effect plan'
      )
    }
  } else {
    const expectedTotal = buildReviewConfirmedExternalEffectPlan(
      payload.revieweeId,
      externalEffects
    ).length
    if (
      total !== expectedTotal ||
      (row.state === 'completed' && cursor !== expectedTotal) ||
      (row.state === 'database_applied' && cursor >= expectedTotal)
    ) {
      throw new InvariantViolationException(
        'Dispute resolved receipt state does not match its effect plan'
      )
    }
  }
  return {
    disputeId: row.dispute_id,
    payloadFingerprint: row.payload_fingerprint,
    eventVersion: 1,
    payload,
    state: row.state,
    externalEffects,
    externalEffectsSavedAt: effectsSavedAt,
    externalEffectCursor: cursor,
    externalEffectTotal: total,
    databaseAppliedAt: requiredDate(row.database_applied_at, 'database timestamp'),
    completedAt: validDate(row.completed_at, 'completion timestamp'),
    externalAttemptCount: attempts,
    lastExternalErrorCode: row.last_external_error_code,
    lastExternalFailedAt: validDate(
      row.last_external_failed_at,
      'external failure timestamp'
    ),
    createdAt: requiredDate(row.created_at, 'creation timestamp'),
    updatedAt: requiredDate(row.updated_at, 'update timestamp'),
  }
}

function assertSamePayload(
  receipt: DisputeResolvedProcessingReceipt,
  payload: DisputeResolvedOutboxPayload,
  expectedFingerprint: string
): void {
  if (
    receipt.payloadFingerprint !== expectedFingerprint ||
    canonicalJson(receipt.payload) !== canonicalJson(payload)
  ) {
    throw new DisputeResolvedReceiptCollisionException(
      payload.disputeId,
      'payload_fingerprint'
    )
  }
}

function validNow(now: Date): void {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('Dispute resolved receipt timestamp must be valid')
  }
}

async function loadForUpdate(
  trx: TransactionClientContract,
  disputeId: string
): Promise<ReceiptRow | undefined> {
  return (await trx
    .from(TABLE)
    .where('dispute_id', disputeId)
    .forUpdate()
    .first()) as ReceiptRow | undefined
}

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
