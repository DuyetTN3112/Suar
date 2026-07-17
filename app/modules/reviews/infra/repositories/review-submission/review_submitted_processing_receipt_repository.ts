import { createHash } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { z } from 'zod'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { ReviewSubmittedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'
import { reviewSubmittedOutboxPayloadSchema } from '#modules/events/public_contracts/review_submitted_outbox_protocol'
import type { TalentExplainabilityProjectionChangedV1 } from '#modules/reviews/public_contracts/talent_explainability_projection_v1'

interface ReceiptRow {
  submission_id: string
  payload_fingerprint: string
  event_version: number | string
  payload: unknown
  rule_version: number | string
  flagged_review_count: number | string | null
  talent_projection: unknown
  completed_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

export interface ReviewSubmittedProcessingReceipt {
  submissionId: string
  payloadFingerprint: string
  eventVersion: 1
  payload: ReviewSubmittedOutboxPayload
  ruleVersion: 1
  flaggedReviewCount: number | null
  talentProjection: TalentExplainabilityProjectionChangedV1 | null
  completedAt: Date | null
}

export interface ClaimReviewSubmittedReceiptResult {
  inserted: boolean
  receipt: ReviewSubmittedProcessingReceipt
}

const TABLE = 'review_submitted_processing_receipts'
const LOCK_TIMEOUT = '5000ms'
const talentProjectionSchema = z
  .object({
    contractVersion: z.literal(1),
    eventType: z.literal('reviews.talent_explainability_projection_changed.v1'),
    revieweeUserId: z.string().trim().min(1).max(255),
    underDisputeSkillsCount: z.number().int().nonnegative(),
    latestConfidenceSignal: z.enum(['low', 'medium', 'high']).nullable(),
    sourceRevision: z.string().regex(/^\d+$/).max(255),
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`
}

function fingerprint(payload: ReviewSubmittedOutboxPayload): string {
  return createHash('sha256')
    .update(canonicalJson({ eventVersion: 1, ruleVersion: 1, payload }))
    .digest('hex')
}

function validDate(value: Date | string | null, field: string): Date | null {
  if (value === null) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new InvariantViolationException(`Review submitted receipt has an invalid ${field}`)
  }
  return date
}

function toReceipt(row: ReceiptRow): ReviewSubmittedProcessingReceipt {
  const eventVersion = Number(row.event_version)
  const ruleVersion = Number(row.rule_version)
  const flaggedReviewCount =
    row.flagged_review_count === null ? null : Number(row.flagged_review_count)
  const parsed = reviewSubmittedOutboxPayloadSchema.safeParse(row.payload)
  const projection =
    row.talent_projection === null
      ? null
      : talentProjectionSchema.safeParse(row.talent_projection)
  if (
    eventVersion !== 1 ||
    ruleVersion !== 1 ||
    !parsed.success ||
    (projection !== null && !projection.success) ||
    (flaggedReviewCount !== null &&
      (!Number.isSafeInteger(flaggedReviewCount) || flaggedReviewCount < 0))
  ) {
    throw new InvariantViolationException(
      'Review submitted receipt contains malformed durable state',
      {
        cause: !parsed.success
          ? parsed.error
          : projection !== null && !projection.success
            ? projection.error
            : undefined,
      }
    )
  }
  const completedAt = validDate(row.completed_at, 'completion timestamp')
  const talentProjection = projection?.success ? projection.data : null
  if (
    (completedAt === null) !== (flaggedReviewCount === null) ||
    (completedAt === null) !== (talentProjection === null)
  ) {
    throw new InvariantViolationException(
      'Review submitted receipt completion fields are inconsistent'
    )
  }
  return {
    submissionId: row.submission_id,
    payloadFingerprint: row.payload_fingerprint,
    eventVersion: 1,
    payload: parsed.data,
    ruleVersion: 1,
    flaggedReviewCount,
    talentProjection,
    completedAt,
  }
}

async function loadForUpdate(
  trx: TransactionClientContract,
  submissionId: string
): Promise<ReceiptRow | undefined> {
  return (await trx.from(TABLE).where('submission_id', submissionId).forUpdate().first()) as
    | ReceiptRow
    | undefined
}

export class ReviewSubmittedProcessingReceiptRepository {
  async claimOrLoad(
    trx: TransactionClientContract,
    unsafePayload: ReviewSubmittedOutboxPayload
  ): Promise<ClaimReviewSubmittedReceiptResult> {
    const payload = reviewSubmittedOutboxPayloadSchema.parse(unsafePayload)
    const payloadFingerprint = fingerprint(payload)
    await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [LOCK_TIMEOUT])
    const rows = (await trx
      .table(TABLE)
      .insert({
        submission_id: payload.submissionId,
        payload_fingerprint: payloadFingerprint,
        event_version: 1,
        payload,
        rule_version: 1,
      })
      .onConflict('submission_id')
      .ignore()
      .returning('*')) as ReceiptRow[]
    if (rows[0]) return { inserted: true, receipt: toReceipt(rows[0]) }

    const row = await loadForUpdate(trx, payload.submissionId)
    if (!row) {
      throw new InvariantViolationException(
        'Review submitted receipt conflict did not resolve to a durable row'
      )
    }
    const receipt = toReceipt(row)
    if (
      receipt.payloadFingerprint !== payloadFingerprint ||
      canonicalJson(receipt.payload) !== canonicalJson(payload)
    ) {
      throw new InvariantViolationException(
        'Review submitted receipt identity collided with a different payload'
      )
    }
    if (!receipt.completedAt || receipt.flaggedReviewCount === null) {
      throw new InvariantViolationException('Committed review submitted receipt is incomplete')
    }
    return { inserted: false, receipt }
  }

  async complete(
    trx: TransactionClientContract,
    submissionId: string,
    flaggedReviewCount: number,
    talentProjection: TalentExplainabilityProjectionChangedV1,
    now: Date = new Date()
  ): Promise<ReviewSubmittedProcessingReceipt> {
    if (
      !Number.isSafeInteger(flaggedReviewCount) ||
      flaggedReviewCount < 0 ||
      Number.isNaN(now.getTime())
    ) {
      throw new RangeError('Review submitted receipt completion is invalid')
    }
    const rows = (await trx
      .from(TABLE)
      .where('submission_id', submissionId)
      .whereNull('completed_at')
      .update({
        flagged_review_count: flaggedReviewCount,
        talent_projection: talentProjection,
        completed_at: now,
        updated_at: now,
      })
      .returning('*')) as ReceiptRow[]
    if (!rows[0]) {
      throw new InvariantViolationException('Review submitted receipt completion lost its row lock')
    }
    return toReceipt(rows[0])
  }
}

export const reviewSubmittedProcessingReceiptRepository =
  new ReviewSubmittedProcessingReceiptRepository()
