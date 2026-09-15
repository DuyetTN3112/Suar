import { createHash } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { DisputeResolvedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'
import {
  DisputeResolvedReceiptCollisionException,
  parseDisputeResolvedReceiptPayload,
  type DisputeResolvedProcessingReceipt,
} from '#modules/disputes/public_contracts/dispute_resolved_processing_receipt'
import {
  buildReviewConfirmedExternalEffectPlan,
  parseReviewConfirmedExternalEffects,
  type ReviewConfirmedExternalEffects,
} from '#modules/reviews/public_contracts/review_confirmed_processing_receipt'

export interface ReceiptRow {
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

export const TABLE = 'dispute_resolved_processing_receipts'
export const LOCK_TIMEOUT = '5000ms'

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`
}

export function fingerprint(payload: DisputeResolvedOutboxPayload): string {
  return createHash('sha256')
    .update(canonicalJson({ eventVersion: 1, payload }))
    .digest('hex')
}

export function validDate(value: Date | string | null, field: string): Date | null {
  if (value === null) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new InvariantViolationException(
      `Dispute resolved receipt has an invalid ${field}`
    )
  }
  return date
}

export function requiredDate(value: Date | string, field: string): Date {
  const date = validDate(value, field)
  if (!date) {
    throw new InvariantViolationException(
      `Dispute resolved receipt is missing ${field}`
    )
  }
  return date
}

export function emptyObject(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  )
}

export function storedEffects(
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

export function toReceipt(row: ReceiptRow): DisputeResolvedProcessingReceipt {
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

export function assertSamePayload(
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

export function validNow(now: Date): void {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('Dispute resolved receipt timestamp must be valid')
  }
}

export async function loadForUpdate(
  trx: TransactionClientContract,
  disputeId: string
): Promise<ReceiptRow | undefined> {
  return (await trx
    .from(TABLE)
    .where('dispute_id', disputeId)
    .forUpdate()
    .first()) as ReceiptRow | undefined
}
