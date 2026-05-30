import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  CacheInvalidationOutboxReplayRepository,
  CacheInvalidationOutboxReplayTransaction,
} from '#modules/cache/actions/ports/outbound/invalidation-outbox/cache_invalidation_outbox_replay_ports'
import type {
  CacheInvalidationOutboxClaimInput,
  CacheInvalidationOutboxFailureInput,
  CacheInvalidationOutboxHeartbeatInput,
  CacheInvalidationOutboxJob,
  CacheInvalidationOutboxLeaseMutationInput,
  CacheInvalidationOutboxReplayRow,
  CacheInvalidationOutboxRepository,
  CacheInvalidationOutboxRetryInput,
} from '#modules/cache/domain/invalidation-outbox/cache_invalidation_outbox'
import { normalizeCacheInvalidationReplaySelector } from '#modules/cache/domain/invalidation-outbox/cache_invalidation_outbox'
import type {
  CacheInvalidationOutboxBacklog,
  CacheInvalidationOutboxOperationalStatus,
  CacheInvalidationOutboxReplaySelector,
} from '#modules/cache/public_contracts/invalidation-outbox/cache_invalidation_outbox_types'

interface CacheInvalidationOutboxDatabaseRow {
  id: string
  sequence: number | string
  source_table: string
  source_operation: 'INSERT' | 'UPDATE' | 'DELETE'
  source_primary_key: string
  patterns: unknown
  attempt_count: number | string
  lease_token: string
  locked_until: Date
}

const MAX_CLAIM_BATCH = 100
const MIN_LEASE_MS = 1_000
const MAX_LEASE_MS = 300_000

function validateClaimInput(input: CacheInvalidationOutboxClaimInput): void {
  if (
    !Number.isSafeInteger(input.batchSize) ||
    input.batchSize < 1 ||
    input.batchSize > MAX_CLAIM_BATCH
  ) {
    throw new RangeError(
      `Cache invalidation outbox batchSize must be between 1 and ${MAX_CLAIM_BATCH}`
    )
  }
  if (
    !Number.isSafeInteger(input.leaseDurationMs) ||
    input.leaseDurationMs < MIN_LEASE_MS ||
    input.leaseDurationMs > MAX_LEASE_MS
  ) {
    throw new RangeError(
      `Cache invalidation outbox leaseDurationMs must be between ${MIN_LEASE_MS} and ${MAX_LEASE_MS}`
    )
  }
  if (input.workerId.trim().length === 0 || input.workerId.length > 200) {
    throw new RangeError('Cache invalidation outbox workerId must contain 1 to 200 characters')
  }
}

function toJob(row: CacheInvalidationOutboxDatabaseRow): CacheInvalidationOutboxJob {
  return {
    id: row.id,
    sequence: Number(row.sequence),
    sourceTable: row.source_table,
    sourceOperation: row.source_operation,
    sourcePrimaryKey: row.source_primary_key,
    patterns: row.patterns,
    attemptCount: Number(row.attempt_count),
    leaseToken: row.lease_token,
    lockedUntil: row.locked_until,
  }
}

function affectedRowCount(result: unknown): number {
  if (Array.isArray(result)) {
    return result.length
  }
  return Number(result)
}

function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '42P01'
  )
}

export class PostgresCacheInvalidationOutboxRepository
  implements CacheInvalidationOutboxRepository, CacheInvalidationOutboxReplayRepository
{
  async claimBatch(
    input: CacheInvalidationOutboxClaimInput
  ): Promise<CacheInvalidationOutboxJob[]> {
    validateClaimInput(input)
    const lockedUntil = new Date(input.now.getTime() + input.leaseDurationMs)

    return db.transaction(async (trx) => {
      const rawResult: unknown = await trx.rawQuery(
        `
          WITH candidates AS (
            SELECT id
            FROM cache_invalidation_outbox
            WHERE (
              (status = 'pending' AND available_at <= ?)
              OR (status = 'leased' AND locked_until <= ?)
            )
            ORDER BY sequence ASC
            FOR UPDATE SKIP LOCKED
            LIMIT ?
          )
          UPDATE cache_invalidation_outbox AS outbox
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
      const rows = (rawResult as { rows?: CacheInvalidationOutboxDatabaseRow[] }).rows ?? []

      return rows.map(toJob).sort((left, right) => left.sequence - right.sequence)
    })
  }

  async heartbeat(input: CacheInvalidationOutboxHeartbeatInput): Promise<boolean> {
    if (
      !Number.isSafeInteger(input.leaseDurationMs) ||
      input.leaseDurationMs < MIN_LEASE_MS ||
      input.leaseDurationMs > MAX_LEASE_MS
    ) {
      throw new RangeError('Invalid cache invalidation outbox heartbeat lease duration')
    }

    const result = await db
      .from('cache_invalidation_outbox')
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

  async acknowledge(input: CacheInvalidationOutboxLeaseMutationInput): Promise<boolean> {
    const result = await db
      .from('cache_invalidation_outbox')
      .where('id', input.jobId)
      .where('lease_token', input.leaseToken)
      .where('status', 'leased')
      .where('locked_until', '>', input.now)
      .update({
        status: 'processed',
        processed_at: input.now,
        locked_by: null,
        locked_until: null,
        lease_token: null,
        last_error_class: null,
        last_error_message: null,
        updated_at: input.now,
      })

    return affectedRowCount(result) === 1
  }

  async retry(input: CacheInvalidationOutboxRetryInput): Promise<boolean> {
    return this.applyFailure(input, {
      status: 'pending',
      available_at: input.availableAt,
      locked_by: null,
      locked_until: null,
      lease_token: null,
      last_error_class: input.errorClass,
      last_error_message: input.errorMessage,
      updated_at: input.now,
    })
  }

  async deadLetter(input: CacheInvalidationOutboxFailureInput): Promise<boolean> {
    return this.applyFailure(input, {
      status: 'dead_letter',
      dead_lettered_at: input.now,
      locked_by: null,
      locked_until: null,
      lease_token: null,
      last_error_class: input.errorClass,
      last_error_message: input.errorMessage,
      updated_at: input.now,
    })
  }

  async replayDeadLetters(
    selector: CacheInvalidationOutboxReplaySelector,
    now: Date,
    transaction: CacheInvalidationOutboxReplayTransaction
  ): Promise<CacheInvalidationOutboxReplayRow[]> {
    const trx = transaction as TransactionClientContract
    const normalized = normalizeCacheInvalidationReplaySelector(selector)
    let query = trx
      .from('cache_invalidation_outbox')
      .select('id', 'sequence')
      .where('status', 'dead_letter')

    if (normalized.ids !== undefined) {
      query = query.whereIn('id', normalized.ids)
    }
    if (normalized.fromSequence !== undefined) {
      query = query.where('sequence', '>=', normalized.fromSequence)
    }
    if (normalized.toSequence !== undefined) {
      query = query.where('sequence', '<=', normalized.toSequence)
    }
    if (normalized.errorClass !== undefined) {
      query = query.where('last_error_class', normalized.errorClass)
    }

    const rows = (await query.orderBy('sequence', 'asc').limit(101).forUpdate()) as Array<{
      id: string
      sequence: number | string
    }>
    if (rows.length > 100) {
      throw new RangeError('Cache invalidation replay matched more than 100 rows')
    }
    if (rows.length === 0) {
      return []
    }

    await trx
      .from('cache_invalidation_outbox')
      .whereIn(
        'id',
        rows.map((row) => row.id)
      )
      .where('status', 'dead_letter')
      .update({
        status: 'pending',
        attempt_count: 0,
        available_at: now,
        locked_by: null,
        locked_until: null,
        lease_token: null,
        processed_at: null,
        dead_lettered_at: null,
        last_error_class: null,
        last_error_message: null,
        updated_at: now,
      })

    return rows.map((row) => ({
      id: row.id,
      sequence: Number(row.sequence),
      previousStatus: 'dead_letter',
    }))
  }

  async operationalStatus(
    now: Date = new Date()
  ): Promise<CacheInvalidationOutboxOperationalStatus> {
    try {
      const rawResult: unknown = await db.rawQuery(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status = 'leased') AS leased,
          COUNT(*) FILTER (WHERE status = 'pending' AND attempt_count > 0) AS retry_pending,
          COUNT(*) FILTER (WHERE status = 'dead_letter') AS dead_letter,
          COUNT(*) FILTER (WHERE status = 'processed') AS processed,
          MIN(created_at) FILTER (
            WHERE status IN ('pending', 'leased')
          ) AS oldest_pending_at
        FROM cache_invalidation_outbox
      `)
      const row = (
        rawResult as {
          rows?: Array<{
            pending: number | string
            leased: number | string
            retry_pending: number | string
            dead_letter: number | string
            processed: number | string
            oldest_pending_at: Date | string | null
          }>
        }
      ).rows?.[0]
      const oldestPendingAt = row?.oldest_pending_at ? new Date(row.oldest_pending_at) : null

      return {
        configured: true,
        pending: Number(row?.pending ?? 0),
        leased: Number(row?.leased ?? 0),
        retryPending: Number(row?.retry_pending ?? 0),
        deadLetter: Number(row?.dead_letter ?? 0),
        processed: Number(row?.processed ?? 0),
        oldestPendingAgeMs:
          oldestPendingAt === null ? null : Math.max(0, now.getTime() - oldestPendingAt.getTime()),
      }
    } catch (error) {
      if (isUndefinedTableError(error)) {
        return {
          configured: false,
          pending: 0,
          leased: 0,
          retryPending: 0,
          deadLetter: 0,
          processed: 0,
          oldestPendingAgeMs: null,
        }
      }
      throw error
    }
  }

  async backlog(): Promise<CacheInvalidationOutboxBacklog> {
    try {
      const row = (await db
        .from('cache_invalidation_outbox')
        .select(
          db.raw(`COUNT(*) FILTER (WHERE status = 'pending')::int AS pending`),
          db.raw(`COUNT(*) FILTER (WHERE status = 'leased')::int AS leased`),
          db.raw(`COUNT(*) FILTER (WHERE status = 'dead_letter')::int AS dead_letter`),
          db.raw(`
            MIN(created_at) FILTER (
              WHERE status IN ('pending', 'leased')
            ) AS oldest_outstanding_at
          `)
        )
        .first()) as
        | {
            pending: number | string
            leased: number | string
            dead_letter: number | string
            oldest_outstanding_at: Date | string | null
          }
        | undefined

      return {
        configured: true,
        pending: Number(row?.pending ?? 0),
        leased: Number(row?.leased ?? 0),
        deadLetter: Number(row?.dead_letter ?? 0),
        oldestOutstandingAt: row?.oldest_outstanding_at
          ? new Date(row.oldest_outstanding_at)
          : null,
      }
    } catch (error) {
      if (isUndefinedTableError(error)) {
        return {
          configured: false,
          pending: 0,
          leased: 0,
          deadLetter: 0,
          oldestOutstandingAt: null,
        }
      }
      throw error
    }
  }

  async purgeProcessedBefore(before: Date, limit = 1_000): Promise<number> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10_000) {
      throw new RangeError('Cache invalidation outbox purge limit must be between 1 and 10000')
    }

    const rawResult: unknown = await db.rawQuery(
      `
        WITH candidates AS (
          SELECT id
          FROM cache_invalidation_outbox
          WHERE status = 'processed'
            AND processed_at < ?
          ORDER BY processed_at ASC, sequence ASC
          LIMIT ?
        )
        DELETE FROM cache_invalidation_outbox AS outbox
        USING candidates
        WHERE outbox.id = candidates.id
        RETURNING outbox.id
      `,
      [before, limit]
    )
    return ((rawResult as { rows?: unknown[] }).rows ?? []).length
  }

  private async applyFailure(
    input: CacheInvalidationOutboxFailureInput,
    update: Record<string, unknown>
  ): Promise<boolean> {
    const result = await db
      .from('cache_invalidation_outbox')
      .where('id', input.jobId)
      .where('lease_token', input.leaseToken)
      .where('status', 'leased')
      .where('locked_until', '>', input.now)
      .update(update)

    return affectedRowCount(result) === 1
  }
}
