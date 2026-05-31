import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { NotificationTransaction } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type { NotificationFanoutRepository } from '#modules/notifications/actions/ports/outbound/notification_fanout_repository'
import type {
  NotificationFanoutClaimInput,
  NotificationFanoutFailureInput,
  NotificationFanoutLeaseInput,
  NotificationFanoutReplayRow,
  NotificationFanoutReplaySelector,
  NotificationFanoutRetryInput,
  NotificationFanoutWorkTarget,
} from '#modules/notifications/domain/notification-outbox/notification_fanout'

interface NotificationFanoutDatabaseRow {
  id: string
  job_id: string
  sequence: number | string
  recipient_id: string
  event_id: string
  attempt_count: number | string
  lease_token: string
  locked_until: Date | string
  notification_type: string
  schema_version: 1
  scope_type: 'user' | 'organization' | 'system'
  scope_id: string | null
  actor_type: string | null
  actor_id: string | null
  subject_type: string | null
  subject_id: string | null
  parameters: Record<string, unknown>
  occurred_at: Date | string
  correlation_id: string | null
  dedupe_key: string | null
}

const MAX_CLAIM_BATCH = 100
const MAX_REPLAY_BATCH = 100
const MIN_LEASE_MS = 1_000
const MAX_LEASE_MS = 300_000

function validateClaimInput(input: NotificationFanoutClaimInput): void {
  if (
    !Number.isSafeInteger(input.batchSize) ||
    input.batchSize < 1 ||
    input.batchSize > MAX_CLAIM_BATCH
  ) {
    throw new RangeError(`Fanout batchSize must be between 1 and ${MAX_CLAIM_BATCH}`)
  }
  if (
    !Number.isSafeInteger(input.leaseDurationMs) ||
    input.leaseDurationMs < MIN_LEASE_MS ||
    input.leaseDurationMs > MAX_LEASE_MS
  ) {
    throw new RangeError(
      `Fanout leaseDurationMs must be between ${MIN_LEASE_MS} and ${MAX_LEASE_MS}`
    )
  }
  if (input.workerId.trim().length === 0 || input.workerId.length > 200) {
    throw new RangeError('Fanout workerId must contain 1 to 200 characters')
  }
}

function throwIfFanoutOperationAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) {
    return
  }
  throw signal.reason instanceof Error
    ? signal.reason
    : new Error('NOTIFICATION_FANOUT_OPERATION_ABORTED')
}

function scopeFor(
  row: NotificationFanoutDatabaseRow
): NotificationFanoutWorkTarget['command']['scope'] {
  if (row.scope_type === 'system') {
    return { kind: 'system' }
  }
  if (!row.scope_id) {
    throw new InvariantViolationException(
      `Notification fanout job ${row.job_id} has an invalid scope`
    )
  }
  return { kind: row.scope_type, id: row.scope_id }
}

function toTarget(row: NotificationFanoutDatabaseRow): NotificationFanoutWorkTarget {
  return {
    id: row.id,
    jobId: row.job_id,
    sequence: Number(row.sequence),
    eventId: row.event_id,
    recipientId: row.recipient_id,
    command: {
      eventId: row.event_id,
      type: row.notification_type,
      schemaVersion: row.schema_version,
      recipientId: row.recipient_id,
      scope: scopeFor(row),
      parameters: row.parameters,
      occurredAt: new Date(row.occurred_at).toISOString(),
      ...(row.actor_type && row.actor_id
        ? { actor: { type: row.actor_type, id: row.actor_id } }
        : {}),
      ...(row.subject_type && row.subject_id
        ? { subject: { type: row.subject_type, id: row.subject_id } }
        : {}),
      ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
      ...(row.dedupe_key ? { dedupeKey: row.dedupe_key } : {}),
    },
    attemptCount: Number(row.attempt_count),
    leaseToken: row.lease_token,
    lockedUntil: new Date(row.locked_until),
  }
}

function rowsFrom(result: unknown): NotificationFanoutDatabaseRow[] {
  return (result as { rows?: NotificationFanoutDatabaseRow[] }).rows ?? []
}

async function advanceJob(
  trx: TransactionClientContract,
  jobId: string,
  terminal: 'processed' | 'dead_letter',
  now: Date
): Promise<void> {
  const processedIncrement = terminal === 'processed' ? 1 : 0
  const deadLetterIncrement = terminal === 'dead_letter' ? 1 : 0

  await trx.rawQuery(
    `
      UPDATE notification_fanout_jobs
      SET
        processed_count = processed_count + ?,
        dead_letter_count = dead_letter_count + ?,
        status = CASE
          WHEN processed_count + ? + dead_letter_count + ? = target_count
            THEN CASE
              WHEN dead_letter_count + ? > 0
                THEN 'completed_with_errors'
              ELSE 'completed'
            END
          ELSE 'processing'
        END,
        completed_at = CASE
          WHEN processed_count + ? + dead_letter_count + ? = target_count
            THEN ?::timestamptz
          ELSE NULL
        END,
        updated_at = ?
      WHERE id = ?
    `,
    [
      processedIncrement,
      deadLetterIncrement,
      processedIncrement,
      deadLetterIncrement,
      deadLetterIncrement,
      processedIncrement,
      deadLetterIncrement,
      now,
      now,
      jobId,
    ]
  )
}

export class PostgresNotificationFanoutRepository implements NotificationFanoutRepository {
  async claimBatch(input: NotificationFanoutClaimInput): Promise<NotificationFanoutWorkTarget[]> {
    validateClaimInput(input)
    throwIfFanoutOperationAborted(input.signal)
    const lockedUntil = new Date(input.now.getTime() + input.leaseDurationMs)

    return db.transaction(async (trx) => {
      throwIfFanoutOperationAborted(input.signal)
      const result: unknown = await trx.rawQuery(
        `
          WITH candidates AS (
            SELECT target.id
            FROM notification_fanout_targets AS target
            WHERE (
              (target.status = 'pending' AND target.available_at <= ?)
              OR (target.status = 'leased' AND target.locked_until <= ?)
            )
            ORDER BY target.sequence ASC
            FOR UPDATE SKIP LOCKED
            LIMIT ?
          ),
          claimed AS (
            UPDATE notification_fanout_targets AS target
            SET
              status = 'leased',
              attempt_count = target.attempt_count + 1,
              locked_by = ?,
              locked_until = ?,
              lease_token = gen_random_uuid(),
              updated_at = ?
            FROM candidates
            WHERE target.id = candidates.id
            RETURNING target.*
          ),
          touched_jobs AS (
            UPDATE notification_fanout_jobs AS job
            SET status = 'processing', updated_at = ?
            WHERE job.id IN (SELECT DISTINCT job_id FROM claimed)
              AND job.status IN ('pending', 'processing')
            RETURNING job.id
          )
          SELECT
            claimed.*,
            job.notification_type,
            job.schema_version,
            job.scope_type,
            job.scope_id,
            job.actor_type,
            job.actor_id,
            job.subject_type,
            job.subject_id,
            job.parameters,
            job.occurred_at,
            job.correlation_id,
            job.dedupe_key
          FROM claimed
          JOIN notification_fanout_jobs AS job ON job.id = claimed.job_id
          ORDER BY claimed.sequence ASC
        `,
        [input.now, input.now, input.batchSize, input.workerId, lockedUntil, input.now, input.now]
      )

      throwIfFanoutOperationAborted(input.signal)
      return rowsFrom(result).map(toTarget)
    })
  }

  async lockForProcessing(
    input: NotificationFanoutLeaseInput,
    transaction: NotificationTransaction
  ): Promise<NotificationFanoutWorkTarget | null> {
    const trx = transaction as TransactionClientContract
    const result: unknown = await trx.rawQuery(
      `
        SELECT
          target.*,
          job.notification_type,
          job.schema_version,
          job.scope_type,
          job.scope_id,
          job.actor_type,
          job.actor_id,
          job.subject_type,
          job.subject_id,
          job.parameters,
          job.occurred_at,
          job.correlation_id,
          job.dedupe_key
        FROM notification_fanout_targets AS target
        JOIN notification_fanout_jobs AS job ON job.id = target.job_id
        WHERE target.id = ?
          AND target.lease_token = ?
          AND target.status = 'leased'
          AND target.locked_until > ?
        FOR UPDATE OF target
      `,
      [input.targetId, input.leaseToken, input.now]
    )
    const row = rowsFrom(result)[0]
    return row ? toTarget(row) : null
  }

  async markProcessed(
    input: NotificationFanoutLeaseInput & { notificationId: string },
    transaction: NotificationTransaction
  ): Promise<boolean> {
    const trx = transaction as TransactionClientContract
    const result: unknown = await trx.rawQuery(
      `
        UPDATE notification_fanout_targets
        SET
          status = 'processed',
          notification_id = ?,
          processed_at = ?,
          locked_by = NULL,
          locked_until = NULL,
          lease_token = NULL,
          last_error_class = NULL,
          last_error_message = NULL,
          updated_at = ?
        WHERE id = ?
          AND lease_token = ?
          AND status = 'leased'
          AND locked_until > ?
        RETURNING job_id
      `,
      [input.notificationId, input.now, input.now, input.targetId, input.leaseToken, input.now]
    )
    const jobId = (result as { rows?: Array<{ job_id: string }> }).rows?.[0]?.job_id
    if (!jobId) {
      return false
    }
    await advanceJob(trx, jobId, 'processed', input.now)
    return true
  }

  async retry(input: NotificationFanoutRetryInput): Promise<boolean> {
    return db.transaction(async (trx) => {
      throwIfFanoutOperationAborted(input.signal)
      const result: unknown = await trx.rawQuery(
        `
          UPDATE notification_fanout_targets
          SET
            status = 'pending',
            available_at = ?,
            locked_by = NULL,
            locked_until = NULL,
            lease_token = NULL,
            last_error_class = ?,
            last_error_message = ?,
            updated_at = ?
          WHERE id = ?
            AND lease_token = ?
            AND status = 'leased'
            AND locked_until > ?
          RETURNING job_id
        `,
        [
          input.availableAt,
          input.errorClass,
          input.errorMessage,
          input.now,
          input.targetId,
          input.leaseToken,
          input.now,
        ]
      )
      throwIfFanoutOperationAborted(input.signal)
      const jobId = (result as { rows?: Array<{ job_id: string }> }).rows?.[0]?.job_id
      if (!jobId) {
        return false
      }
      await trx
        .from('notification_fanout_jobs')
        .where('id', jobId)
        .whereIn('status', ['pending', 'processing'])
        .update({ status: 'processing', updated_at: input.now })
      throwIfFanoutOperationAborted(input.signal)
      return true
    })
  }

  async deadLetter(input: NotificationFanoutFailureInput): Promise<boolean> {
    return db.transaction(async (trx) => {
      throwIfFanoutOperationAborted(input.signal)
      const result: unknown = await trx.rawQuery(
        `
          UPDATE notification_fanout_targets
          SET
            status = 'dead_letter',
            dead_lettered_at = ?,
            locked_by = NULL,
            locked_until = NULL,
            lease_token = NULL,
            last_error_class = ?,
            last_error_message = ?,
            updated_at = ?
          WHERE id = ?
            AND lease_token = ?
            AND status = 'leased'
            AND locked_until > ?
          RETURNING job_id
        `,
        [
          input.now,
          input.errorClass,
          input.errorMessage,
          input.now,
          input.targetId,
          input.leaseToken,
          input.now,
        ]
      )
      throwIfFanoutOperationAborted(input.signal)
      const jobId = (result as { rows?: Array<{ job_id: string }> }).rows?.[0]?.job_id
      if (!jobId) {
        return false
      }
      await advanceJob(trx, jobId, 'dead_letter', input.now)
      throwIfFanoutOperationAborted(input.signal)
      return true
    })
  }

  async replayDeadLetters(
    selector: NotificationFanoutReplaySelector,
    now: Date,
    trx: TransactionClientContract
  ): Promise<NotificationFanoutReplayRow[]> {
    let query = trx
      .from('notification_fanout_targets')
      .select('id', 'job_id', 'sequence')
      .where('status', 'dead_letter')

    if (selector.ids !== undefined) {
      if (selector.ids.length === 0 || selector.ids.length > MAX_REPLAY_BATCH) {
        throw new RangeError(
          `Fanout replay ids must contain between 1 and ${MAX_REPLAY_BATCH} values`
        )
      }
      query = query.whereIn('id', selector.ids)
    }
    if (selector.jobId !== undefined) {
      query = query.where('job_id', selector.jobId)
    }
    if (selector.fromSequence !== undefined) {
      query = query.where('sequence', '>=', selector.fromSequence)
    }
    if (selector.toSequence !== undefined) {
      query = query.where('sequence', '<=', selector.toSequence)
    }
    if (selector.errorClass !== undefined) {
      query = query.where('last_error_class', selector.errorClass)
    }

    const rows = (await query
      .orderBy('sequence', 'asc')
      .limit(MAX_REPLAY_BATCH + 1)
      .forUpdate()) as Array<{
      id: string
      job_id: string
      sequence: number | string
    }>
    if (rows.length > MAX_REPLAY_BATCH) {
      throw new RangeError(
        `Fanout replay selector matches more than ${MAX_REPLAY_BATCH} rows; narrow the selector`
      )
    }
    if (rows.length === 0) {
      return []
    }

    await trx
      .from('notification_fanout_targets')
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

    const replayCountByJob = new Map<string, number>()
    for (const row of rows) {
      replayCountByJob.set(row.job_id, (replayCountByJob.get(row.job_id) ?? 0) + 1)
    }
    for (const [jobId, replayedCount] of replayCountByJob) {
      await trx
        .from('notification_fanout_jobs')
        .where('id', jobId)
        .where('dead_letter_count', '>=', replayedCount)
        .update({
          dead_letter_count: trx.raw('dead_letter_count - ?', [replayedCount]),
          status: 'processing',
          completed_at: null,
          updated_at: now,
        })
    }

    return rows.map((row) => ({
      id: row.id,
      jobId: row.job_id,
      sequence: Number(row.sequence),
      previousStatus: 'dead_letter',
    }))
  }

  async operationalStatus(
    now: Date = new Date(),
    countLimit?: number
  ): Promise<{
    pending: number
    leased: number
    retryPending: number
    processed: number
    deadLetter: number
    activeJobs: number
    completedJobs: number
    completedWithErrorsJobs: number
    oldestPendingAgeMs: number | null
  }> {
    if (
      countLimit !== undefined &&
      (!Number.isSafeInteger(countLimit) || countLimit < 1 || countLimit > 10_000_000)
    ) {
      throw new RangeError('Notification fanout operational count limit is invalid')
    }
    const result: unknown =
      countLimit === undefined
        ? await db.rawQuery(`
            SELECT
              COUNT(*) FILTER (WHERE target.status = 'pending') AS pending,
              COUNT(*) FILTER (WHERE target.status = 'leased') AS leased,
              COUNT(*) FILTER (
                WHERE target.status = 'pending' AND target.attempt_count > 0
              ) AS retry_pending,
              COUNT(*) FILTER (WHERE target.status = 'processed') AS processed,
              COUNT(*) FILTER (WHERE target.status = 'dead_letter') AS dead_letter,
              MIN(target.created_at) FILTER (
                WHERE target.status IN ('pending', 'leased')
              ) AS oldest_pending_at,
              (
                SELECT COUNT(*)
                FROM notification_fanout_jobs
                WHERE status IN ('pending', 'processing')
              ) AS active_jobs,
              (
                SELECT COUNT(*)
                FROM notification_fanout_jobs
                WHERE status = 'completed'
              ) AS completed_jobs,
              (
                SELECT COUNT(*)
                FROM notification_fanout_jobs
                WHERE status = 'completed_with_errors'
              ) AS completed_with_errors_jobs
            FROM notification_fanout_targets AS target
          `)
        : await db.rawQuery(
            `
              SELECT
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_fanout_targets
                    WHERE status = 'pending'
                    LIMIT ?
                  ) AS bounded
                ) AS pending,
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_fanout_targets
                    WHERE status = 'leased'
                    LIMIT ?
                  ) AS bounded
                ) AS leased,
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_fanout_targets
                    WHERE status = 'pending' AND attempt_count > 0
                    LIMIT ?
                  ) AS bounded
                ) AS retry_pending,
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_fanout_targets
                    WHERE status = 'processed'
                    LIMIT ?
                  ) AS bounded
                ) AS processed,
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_fanout_targets
                    WHERE status = 'dead_letter'
                    LIMIT ?
                  ) AS bounded
                ) AS dead_letter,
                (
                  SELECT created_at
                  FROM notification_fanout_targets
                  WHERE status IN ('pending', 'leased')
                  ORDER BY created_at
                  LIMIT 1
                ) AS oldest_pending_at,
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_fanout_jobs
                    WHERE status IN ('pending', 'processing')
                    LIMIT ?
                  ) AS bounded
                ) AS active_jobs,
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_fanout_jobs
                    WHERE status = 'completed'
                    LIMIT ?
                  ) AS bounded
                ) AS completed_jobs,
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_fanout_jobs
                    WHERE status = 'completed_with_errors'
                    LIMIT ?
                  ) AS bounded
                ) AS completed_with_errors_jobs
            `,
            [
              countLimit,
              countLimit,
              countLimit,
              countLimit,
              countLimit,
              countLimit,
              countLimit,
              countLimit,
            ]
          )
    const row = (
      result as {
        rows?: Array<Record<string, string | number | Date | null>>
      }
    ).rows?.[0]
    const oldestPendingAt = row?.['oldest_pending_at'] ? new Date(row['oldest_pending_at']) : null

    return {
      pending: Number(row?.['pending'] ?? 0),
      leased: Number(row?.['leased'] ?? 0),
      retryPending: Number(row?.['retry_pending'] ?? 0),
      processed: Number(row?.['processed'] ?? 0),
      deadLetter: Number(row?.['dead_letter'] ?? 0),
      activeJobs: Number(row?.['active_jobs'] ?? 0),
      completedJobs: Number(row?.['completed_jobs'] ?? 0),
      completedWithErrorsJobs: Number(row?.['completed_with_errors_jobs'] ?? 0),
      oldestPendingAgeMs:
        oldestPendingAt === null ? null : Math.max(0, now.getTime() - oldestPendingAt.getTime()),
    }
  }
}
