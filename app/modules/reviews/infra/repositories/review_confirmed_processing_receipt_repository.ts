import { createHash } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { z } from 'zod'

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

interface ReceiptDatabaseRow {
  confirmation_id: string
  payload_fingerprint: string
  event_version: number | string
  review_session_id: string
  reviewee_id: string
  reviewer_ids: unknown
  confirmed_by: string
  action: 'confirmed' | 'disputed'
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

const TABLE = 'review_confirmed_processing_receipts'
const RECEIPT_LOCK_TIMEOUT = '5000ms'

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`
  }
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`
}

function payloadFingerprint(input: ClaimReviewConfirmedReceiptInput): string {
  return createHash('sha256')
    .update(canonicalJson({ eventVersion: input.eventVersion, payload: input.payload }))
    .digest('hex')
}

function asValidDate(value: Date | string | null, field: string): Date | null {
  if (value === null) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new InvariantViolationException(`Review confirmed receipt has an invalid ${field}`)
  }
  return date
}

const reviewerIdsSchema = z
  .array(z.string().trim().min(1).max(255))
  .max(500)
  .refine((values) => new Set(values).size === values.length)
  .refine((values) =>
    values.every(
      (value, index) => index === 0 || (values[index - 1] ?? '').localeCompare(value) < 0
    )
  )

function parseReviewerIds(value: unknown): string[] {
  const parsed = reviewerIdsSchema.safeParse(value)
  if (!parsed.success) {
    throw new InvariantViolationException(
      'Review confirmed receipt contains malformed reviewer identities',
      { cause: parsed.error }
    )
  }
  return parsed.data
}

function asRequiredDate(value: Date | string, field: string): Date {
  const parsed = asValidDate(value, field)
  if (parsed === null) {
    throw new InvariantViolationException(`Review confirmed receipt is missing ${field}`)
  }
  return parsed
}

function parseStoredEffects(
  value: unknown,
  savedAt: Date | string | null
): ReviewConfirmedExternalEffects | null {
  if (savedAt === null && isEmptyObject(value)) return null
  try {
    return parseReviewConfirmedExternalEffects(value as ReviewConfirmedExternalEffects)
  } catch (error) {
    throw new InvariantViolationException(
      'Review confirmed receipt contains malformed persisted external effects',
      { cause: error }
    )
  }
}

function isEmptyObject(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  )
}

function toReceipt(row: ReceiptDatabaseRow): ReviewConfirmedProcessingReceipt {
  const version = Number(row.event_version)
  if (version !== 1) {
    throw new InvariantViolationException(
      'Review confirmed receipt contains an unsupported event version'
    )
  }
  const attemptCount = Number(row.external_attempt_count)
  if (!Number.isSafeInteger(attemptCount) || attemptCount < 0) {
    throw new InvariantViolationException(
      'Review confirmed receipt contains an invalid external attempt count'
    )
  }
  const effectsSavedAt = asValidDate(
    row.external_effects_saved_at,
    'external effects timestamp'
  )
  const externalEffectCursor = Number(row.external_effect_cursor)
  const externalEffectTotal =
    row.external_effect_total === null ? null : Number(row.external_effect_total)
  if (
    !Number.isSafeInteger(externalEffectCursor) ||
    externalEffectCursor < 0 ||
    (externalEffectTotal !== null &&
      (!Number.isSafeInteger(externalEffectTotal) ||
        externalEffectTotal < 1 ||
        externalEffectCursor > externalEffectTotal))
  ) {
    throw new InvariantViolationException(
      'Review confirmed receipt contains an invalid external effect cursor'
    )
  }
  const externalEffects = parseStoredEffects(row.external_effects, effectsSavedAt)
  if (externalEffects === null) {
    if (
      externalEffectCursor !== 0 ||
      externalEffectTotal !== null ||
      row.state !== 'database_applied'
    ) {
      throw new InvariantViolationException(
        'Review confirmed receipt has checkpoints before its effect plan is saved'
      )
    }
  } else {
    const expectedTotal = buildReviewConfirmedExternalEffectPlan(
      row.reviewee_id,
      externalEffects
    ).length
    if (externalEffectTotal !== expectedTotal) {
      throw new InvariantViolationException(
        'Review confirmed receipt effect total does not match its durable plan'
      )
    }
    if (
      (row.state === 'completed' && externalEffectCursor !== expectedTotal) ||
      (row.state === 'database_applied' && externalEffectCursor >= expectedTotal)
    ) {
      throw new InvariantViolationException(
        'Review confirmed receipt state does not match its external effect cursor'
      )
    }
  }
  return {
    confirmationId: row.confirmation_id,
    payloadFingerprint: row.payload_fingerprint,
    eventVersion: 1,
    reviewSessionId: row.review_session_id,
    revieweeId: row.reviewee_id,
    reviewerIds: parseReviewerIds(row.reviewer_ids),
    confirmedBy: row.confirmed_by,
    action: row.action,
    state: row.state,
    externalEffects,
    externalEffectsSavedAt: effectsSavedAt,
    externalEffectCursor,
    externalEffectTotal,
    databaseAppliedAt: asRequiredDate(
      row.database_applied_at,
      'database applied timestamp'
    ),
    completedAt: asValidDate(row.completed_at, 'completion timestamp'),
    externalAttemptCount: attemptCount,
    lastExternalErrorCode: row.last_external_error_code,
    lastExternalFailedAt: asValidDate(
      row.last_external_failed_at,
      'external failure timestamp'
    ),
    createdAt: asRequiredDate(row.created_at, 'creation timestamp'),
    updatedAt: asRequiredDate(row.updated_at, 'update timestamp'),
  }
}

function assertSameClaim(
  receipt: ReviewConfirmedProcessingReceipt,
  input: ClaimReviewConfirmedReceiptInput,
  fingerprint: string
): void {
  const payload = input.payload
  if (receipt.payloadFingerprint !== fingerprint) {
    throw new ReviewConfirmedReceiptCollisionException(
      payload.confirmationId,
      'payload_fingerprint'
    )
  }
  if (
    receipt.reviewSessionId !== payload.reviewSessionId ||
    receipt.revieweeId !== payload.revieweeId ||
    receipt.confirmedBy !== payload.confirmedBy ||
    receipt.action !== payload.action ||
    canonicalJson(receipt.reviewerIds) !== canonicalJson(payload.reviewerIds)
  ) {
    throw new ReviewConfirmedReceiptCollisionException(
      payload.confirmationId,
      'event_identity'
    )
  }
}

function assertValidTimestamp(now: Date): void {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('Review confirmed receipt timestamp must be valid')
  }
}

async function loadForUpdate(
  trx: TransactionClientContract,
  confirmationId: string
): Promise<ReceiptDatabaseRow | undefined> {
  return (await trx
    .from(TABLE)
    .where('confirmation_id', confirmationId)
    .forUpdate()
    .first()) as ReceiptDatabaseRow | undefined
}

async function loadCurrent(confirmationId: string): Promise<ReceiptDatabaseRow | undefined> {
  return (await db
    .from(TABLE)
    .where('confirmation_id', confirmationId)
    .first()) as ReceiptDatabaseRow | undefined
}

export class ReviewConfirmedProcessingReceiptRepository {
  async claimOrLoadDatabaseApplied(
    trx: TransactionClientContract,
    unsafeInput: ClaimReviewConfirmedReceiptInput
  ): Promise<ClaimReviewConfirmedReceiptResult> {
    const input = parseClaimReviewConfirmedReceiptInput(unsafeInput)
    const fingerprint = payloadFingerprint(input)
    await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [
      RECEIPT_LOCK_TIMEOUT,
    ])

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
        throw new ReviewConfirmedReceiptCollisionException(
          confirmationId,
          'external_effects'
        )
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
      throw new InvariantViolationException(
        'Cannot complete a missing review confirmed receipt'
      )
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
      await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [
        RECEIPT_LOCK_TIMEOUT,
      ])
      const row = await loadForUpdate(trx, input.confirmationId)
      if (!row) {
        throw new InvariantViolationException(
          'Cannot advance a missing review confirmed receipt'
        )
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
