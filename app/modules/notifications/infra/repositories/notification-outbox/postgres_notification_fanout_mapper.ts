import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  NotificationFanoutClaimInput,
  NotificationFanoutWorkTarget,
} from '#modules/notifications/domain/notification-outbox/notification_fanout'

export interface NotificationFanoutDatabaseRow {
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

export const MAX_CLAIM_BATCH = 100
export const MAX_REPLAY_BATCH = 100
export const MIN_LEASE_MS = 1_000
export const MAX_LEASE_MS = 300_000

export function validateClaimInput(input: NotificationFanoutClaimInput): void {
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

export function throwIfFanoutOperationAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) {
    return
  }
  throw signal.reason instanceof Error
    ? signal.reason
    : new Error('NOTIFICATION_FANOUT_OPERATION_ABORTED')
}

export function scopeFor(
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

export function toTarget(row: NotificationFanoutDatabaseRow): NotificationFanoutWorkTarget {
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

export function rowsFrom(result: unknown): NotificationFanoutDatabaseRow[] {
  return (result as { rows?: NotificationFanoutDatabaseRow[] }).rows ?? []
}

export async function advanceJob(
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
