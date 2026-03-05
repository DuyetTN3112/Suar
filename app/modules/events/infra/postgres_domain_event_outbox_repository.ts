import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  ClaimDomainEventBatchInput,
  DomainEventDeadLetterInput,
  DomainEventHeartbeatInput,
  DomainEventLeaseMutationInput,
  DomainEventOutboxRepository,
  DomainEventRetryInput,
  DurableDomainEventJob,
  DurableDomainEventName,
  StageDomainEventResult,
  ValidatedStageDomainEventInput,
} from '#modules/events/domain/domain_event_outbox'
import {
  buildDurableDomainEventFingerprint,
  parseStageDomainEventInput,
} from '#modules/events/domain/domain_event_outbox'
import type { DomainEventStager } from '#modules/events/public_contracts/domain_event_outbox'

interface DomainEventOutboxDatabaseRow {
  id: string
  sequence: number | string
  event_name: DurableDomainEventName
  event_version: number | string
  dedupe_fingerprint: string
  aggregate_type:
    | 'auth_session'
    | 'task_assignment'
    | 'project'
    | 'user'
    | 'review_session'
    | 'review_dispute'
    | 'user_talent'
  aggregate_id: string
  payload: unknown
  attempt_count: number | string
  lease_token: string
  locked_until: Date
}

const MAX_CLAIM_BATCH = 100
const MIN_LEASE_DURATION_MS = 1_000
const MAX_LEASE_DURATION_MS = 300_000
const MAX_WORKER_ID_LENGTH = 200
const MAX_ERROR_CODE_LENGTH = 128

function validateLeaseDurationMs(leaseDurationMs: number): void {
  if (
    !Number.isSafeInteger(leaseDurationMs) ||
    leaseDurationMs < MIN_LEASE_DURATION_MS ||
    leaseDurationMs > MAX_LEASE_DURATION_MS
  ) {
    throw new RangeError(
      `Domain event outbox leaseDurationMs must be between ${MIN_LEASE_DURATION_MS} and ${MAX_LEASE_DURATION_MS}`
    )
  }
}

function asTransactionClient(trx: object): TransactionClientContract {
  if (!('rawQuery' in trx) || typeof trx.rawQuery !== 'function') {
    throw new TypeError('Domain event staging requires an active database transaction')
  }
  return trx as TransactionClientContract
}

function validateClaimInput(input: ClaimDomainEventBatchInput): void {
  if (
    !Number.isSafeInteger(input.batchSize) ||
    input.batchSize < 1 ||
    input.batchSize > MAX_CLAIM_BATCH
  ) {
    throw new RangeError(`Domain event outbox batchSize must be between 1 and ${MAX_CLAIM_BATCH}`)
  }
  validateLeaseDurationMs(input.leaseDurationMs)
  if (input.workerId.trim().length < 1 || input.workerId.length > MAX_WORKER_ID_LENGTH) {
    throw new RangeError(
      `Domain event outbox workerId must contain 1 to ${MAX_WORKER_ID_LENGTH} characters`
    )
  }
  if (Number.isNaN(input.now.getTime())) {
    throw new RangeError('Domain event outbox claim time must be valid')
  }
}

function validateErrorCode(errorCode: string): void {
  if (
    errorCode.length < 1 ||
    errorCode.length > MAX_ERROR_CODE_LENGTH ||
    !/^[A-Za-z0-9_.:-]+$/.test(errorCode)
  ) {
    throw new RangeError(
      `Domain event outbox errorCode must contain 1 to ${MAX_ERROR_CODE_LENGTH} safe characters`
    )
  }
}

function affectedRowCount(result: unknown): number {
  if (typeof result === 'number') return result
  if (typeof result === 'bigint') return Number(result)
  if (Array.isArray(result)) return result.length
  return 0
}

function toJob(row: DomainEventOutboxDatabaseRow): DurableDomainEventJob {
  return {
    id: row.id,
    sequence: Number(row.sequence),
    eventName: row.event_name,
    eventVersion: Number(row.event_version),
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    payload: row.payload,
    dedupeFingerprint: row.dedupe_fingerprint,
    attemptCount: Number(row.attempt_count),
    leaseToken: row.lease_token,
    lockedUntil: row.locked_until,
  }
}

export class PostgresDomainEventOutboxRepository
  implements DomainEventOutboxRepository, DomainEventStager
{
  async stage(
    unsafeTrx: object,
    unsafeInput: ValidatedStageDomainEventInput
  ): Promise<StageDomainEventResult> {
    const trx = asTransactionClient(unsafeTrx)
    const input = parseStageDomainEventInput(unsafeInput)
    const fingerprint = buildDurableDomainEventFingerprint(input)
    const rows = (await trx
      .table('domain_event_outbox')
      .insert({
        event_name: input.eventName,
        event_version: 1,
        dedupe_key: input.dedupeKey,
        dedupe_fingerprint: fingerprint,
        aggregate_type: input.aggregateType,
        aggregate_id: input.aggregateId,
        payload: input.payload,
      })
      .onConflict(['event_name', 'dedupe_key'])
      .ignore()
      .returning(['id'])) as Array<{ id: string }>
    const inserted = rows[0]
    if (inserted) {
      return { id: inserted.id, staged: true }
    }

    const existing = (await trx
      .from('domain_event_outbox')
      .select('id', 'dedupe_fingerprint')
      .where('event_name', input.eventName)
      .where('dedupe_key', input.dedupeKey)
      .first()) as { id: string; dedupe_fingerprint: string } | undefined
    if (!existing) {
      throw new InvariantViolationException(
        'Domain event outbox dedupe conflict did not resolve to an existing row'
      )
    }
    if (existing.dedupe_fingerprint !== fingerprint) {
      throw new InvariantViolationException(
        'Domain event outbox dedupe key was reused for a different event'
      )
    }
    return { id: existing.id, staged: false }
  }

  async claimBatch(input: ClaimDomainEventBatchInput): Promise<DurableDomainEventJob[]> {
    validateClaimInput(input)
    const lockedUntil = new Date(input.now.getTime() + input.leaseDurationMs)

    return db.transaction(async (trx) => {
      const result: unknown = await trx.rawQuery(
        `
          WITH candidates AS (
            SELECT candidate.id
            FROM domain_event_outbox AS candidate
            WHERE (
              (candidate.status = 'pending' AND candidate.available_at <= ?)
              OR (candidate.status = 'leased' AND candidate.locked_until <= ?)
            )
            AND NOT EXISTS (
              SELECT 1
              FROM domain_event_outbox AS predecessor
              WHERE predecessor.aggregate_type = candidate.aggregate_type
                AND predecessor.aggregate_id = candidate.aggregate_id
                AND predecessor.sequence < candidate.sequence
                AND predecessor.status IN ('pending', 'leased')
            )
            ORDER BY candidate.sequence ASC
            FOR UPDATE OF candidate SKIP LOCKED
            LIMIT ?
          )
          UPDATE domain_event_outbox AS outbox
          SET
            status = 'leased',
            attempt_count = outbox.attempt_count + 1,
            locked_by = ?,
            locked_until = ?,
            lease_token = gen_random_uuid(),
            updated_at = ?
          FROM candidates
          WHERE outbox.id = candidates.id
          RETURNING outbox.*
        `,
        [input.now, input.now, input.batchSize, input.workerId, lockedUntil, input.now]
      )
      const rows = (result as { rows?: DomainEventOutboxDatabaseRow[] }).rows ?? []
      return rows.map(toJob).sort((left, right) => left.sequence - right.sequence)
    })
  }

  async heartbeat(input: DomainEventHeartbeatInput): Promise<boolean> {
    validateLeaseDurationMs(input.leaseDurationMs)
    if (Number.isNaN(input.now.getTime())) {
      throw new RangeError('Domain event outbox heartbeat time must be valid')
    }
    const result = await db
      .from('domain_event_outbox')
      .where('id', input.jobId)
      .where('lease_token', input.leaseToken)
      .where('status', 'leased')
      .where('locked_until', '>', input.now)
      .update({
        locked_until: new Date(input.now.getTime() + input.leaseDurationMs),
        updated_at: input.now,
      })
    return affectedRowCount(result) === 1
  }

  async acknowledge(input: DomainEventLeaseMutationInput): Promise<boolean> {
    const result = await db
      .from('domain_event_outbox')
      .where('id', input.jobId)
      .where('lease_token', input.leaseToken)
      .where('status', 'leased')
      .where('locked_until', '>', input.now)
      .update({
        status: 'processed',
        ...(input.redactPayload
          ? {
              payload: db.raw(`
                jsonb_build_object(
                  'redacted', true,
                  'eventId', payload->'eventId',
                  'action', payload->'action',
                  'occurredAt', payload->'occurredAt'
                )
              `),
            }
          : {}),
        processed_at: input.now,
        locked_by: null,
        locked_until: null,
        lease_token: null,
        last_error_code: null,
        updated_at: input.now,
      })
    return affectedRowCount(result) === 1
  }

  async retry(input: DomainEventRetryInput): Promise<boolean> {
    validateErrorCode(input.errorCode)
    if (input.availableAt <= input.now) {
      throw new RangeError('Domain event outbox retry availableAt must be after now')
    }
    return this.applyFailure(input, {
      status: 'pending',
      available_at: input.availableAt,
      locked_by: null,
      locked_until: null,
      lease_token: null,
      last_error_code: input.errorCode,
      updated_at: input.now,
    })
  }

  async deadLetter(input: DomainEventDeadLetterInput): Promise<boolean> {
    validateErrorCode(input.errorCode)
    return this.applyFailure(input, {
      status: 'dead_letter',
      dead_lettered_at: input.now,
      locked_by: null,
      locked_until: null,
      lease_token: null,
      last_error_code: input.errorCode,
      updated_at: input.now,
    })
  }

  private async applyFailure(
    input: DomainEventLeaseMutationInput,
    updates: Record<string, unknown>
  ): Promise<boolean> {
    const result = await db
      .from('domain_event_outbox')
      .where('id', input.jobId)
      .where('lease_token', input.leaseToken)
      .where('status', 'leased')
      .where('locked_until', '>', input.now)
      .update(updates)
    return affectedRowCount(result) === 1
  }
}
