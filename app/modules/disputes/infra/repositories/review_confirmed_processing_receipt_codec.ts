import { createHash } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { z } from 'zod'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  buildReviewConfirmedExternalEffectPlan,
  parseReviewConfirmedExternalEffects,
  ReviewConfirmedReceiptCollisionException,
  type ClaimReviewConfirmedReceiptInput,
  type ReviewConfirmedExternalEffects,
  type ReviewConfirmedProcessingReceipt,
} from '#modules/reviews/public_contracts/review_confirmed_processing_receipt'

export interface ReceiptDatabaseRow {
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

export const TABLE = 'review_confirmed_processing_receipts'
export const RECEIPT_LOCK_TIMEOUT = '5000ms'

export function canonicalJson(value: unknown): string {
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

export function payloadFingerprint(input: ClaimReviewConfirmedReceiptInput): string {
  return createHash('sha256')
    .update(canonicalJson({ eventVersion: input.eventVersion, payload: input.payload }))
    .digest('hex')
}

export function asValidDate(value: Date | string | null, field: string): Date | null {
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

export function parseReviewerIds(value: unknown): string[] {
  const parsed = reviewerIdsSchema.safeParse(value)
  if (!parsed.success) {
    throw new InvariantViolationException(
      'Review confirmed receipt contains malformed reviewer identities',
      { cause: parsed.error }
    )
  }
  return parsed.data
}

export function asRequiredDate(value: Date | string, field: string): Date {
  const parsed = asValidDate(value, field)
  if (parsed === null) {
    throw new InvariantViolationException(`Review confirmed receipt is missing ${field}`)
  }
  return parsed
}

export function isEmptyObject(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  )
}

export function parseStoredEffects(
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

export function toReceipt(row: ReceiptDatabaseRow): ReviewConfirmedProcessingReceipt {
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

export function assertSameClaim(
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

export function assertValidTimestamp(now: Date): void {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('Review confirmed receipt timestamp must be valid')
  }
}

export async function loadForUpdate(
  trx: TransactionClientContract,
  confirmationId: string
): Promise<ReceiptDatabaseRow | undefined> {
  return (await trx
    .from(TABLE)
    .where('confirmation_id', confirmationId)
    .forUpdate()
    .first()) as ReceiptDatabaseRow | undefined
}

export async function loadCurrent(
  confirmationId: string
): Promise<ReceiptDatabaseRow | undefined> {
  return (await db
    .from(TABLE)
    .where('confirmation_id', confirmationId)
    .first()) as ReceiptDatabaseRow | undefined
}
