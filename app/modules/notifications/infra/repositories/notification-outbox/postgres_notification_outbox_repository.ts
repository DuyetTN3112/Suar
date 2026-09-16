import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  affectedRowCount,
  discardNotificationOutboxDeadLetters,
  previewNotificationOutboxDeadLetters,
  replayNotificationOutboxDeadLetters,
} from './postgres_notification_outbox_dlq_delegate.js'
import {
  queryNotificationOutboxOperationalStatus,
  type NotificationOutboxOperationalStatus,
} from './postgres_notification_outbox_status_delegate.js'

import type {
  NotificationOutboxClaimInput,
  NotificationOutboxFailureInput,
  NotificationOutboxHeartbeatInput,
  NotificationOutboxJob,
  NotificationOutboxLeaseMutationInput,
  NotificationOutboxRepository,
  NotificationOutboxReplayRow,
  NotificationOutboxReplaySelector,
  NotificationOutboxRetryInput,
} from '#modules/notifications/domain/notification-outbox/notification_outbox'
import type {
  NotificationOutboxDeadLetterPreviewInput,
  NotificationOutboxDeadLetterPreviewPage,
  NotificationOutboxDiscardRow,
} from '#modules/notifications/domain/notification-outbox/notification_outbox_dlq'

export { type NotificationOutboxOperationalStatus } from './postgres_notification_outbox_status_delegate.js'

interface NotificationOutboxDatabaseRow {
  id: string
  sequence: number | string
  notification_id: string | null
  operation_id: string
  source_event_id: string
  event_kind: string
  revision: number | string
  projection_revision: number | string
  destination: 'feed_search' | 'unread_cache'
  partition_key: string
  recipient_id: string
  recipient_state_revision: number | string
  payload: Record<string, unknown>
  attempt_count: number | string
  lease_token: string
  locked_until: Date
}

const MAX_CLAIM_BATCH = 100
const MIN_LEASE_MS = 1_000
const MAX_LEASE_MS = 300_000

function validateClaimInput(input: NotificationOutboxClaimInput): void {
  if (
    !Number.isSafeInteger(input.batchSize) ||
    input.batchSize < 1 ||
    input.batchSize > MAX_CLAIM_BATCH
  ) {
    throw new RangeError(`Outbox batchSize must be between 1 and ${MAX_CLAIM_BATCH}`)
  }
  if (
    !Number.isSafeInteger(input.leaseDurationMs) ||
    input.leaseDurationMs < MIN_LEASE_MS ||
    input.leaseDurationMs > MAX_LEASE_MS
  ) {
    throw new RangeError(
      `Outbox leaseDurationMs must be between ${MIN_LEASE_MS} and ${MAX_LEASE_MS}`
    )
  }
  if (input.workerId.trim().length === 0 || input.workerId.length > 200) {
    throw new RangeError('Outbox workerId must contain 1 to 200 characters')
  }
}

function toJob(row: NotificationOutboxDatabaseRow): NotificationOutboxJob {
  return {
    id: row.id,
    sequence: Number(row.sequence),
    notificationId: row.notification_id,
    operationId: row.operation_id,
    sourceEventId: row.source_event_id,
    eventKind: row.event_kind,
    revision: Number(row.revision),
    projectionRevision: Number(row.projection_revision),
    destination: row.destination,
    partitionKey: row.partition_key,
    recipientId: row.recipient_id,
    recipientStateRevision: Number(row.recipient_state_revision),
    payload: row.payload,
    attemptCount: Number(row.attempt_count),
    leaseToken: row.lease_token,
    lockedUntil: row.locked_until,
  }
}

export class PostgresNotificationOutboxRepository implements NotificationOutboxRepository {
  async claimBatch(input: NotificationOutboxClaimInput): Promise<NotificationOutboxJob[]> {
    validateClaimInput(input)
    const lockedUntil = new Date(input.now.getTime() + input.leaseDurationMs)

    return db.transaction(async (trx) => {
      const rawResult: unknown = await trx.rawQuery(
        `
          WITH candidates AS (
            SELECT id
            FROM notification_outbox
            WHERE (
              (status = 'pending' AND available_at <= ?)
              OR (status = 'leased' AND locked_until <= ?)
            )
              AND (?::text = '' OR destination = ?::text)
            ORDER BY sequence ASC
            FOR UPDATE SKIP LOCKED
            LIMIT ?
          )
          UPDATE notification_outbox AS outbox
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
        [
          input.now,
          input.now,
          input.destination ?? '',
          input.destination ?? '',
          input.batchSize,
          input.workerId,
          lockedUntil,
          input.now,
        ]
      )
      const rows = (rawResult as { rows?: NotificationOutboxDatabaseRow[] }).rows ?? []

      return rows.map(toJob).sort((left, right) => left.sequence - right.sequence)
    })
  }

  async heartbeat(input: NotificationOutboxHeartbeatInput): Promise<boolean> {
    if (
      !Number.isSafeInteger(input.leaseDurationMs) ||
      input.leaseDurationMs < MIN_LEASE_MS ||
      input.leaseDurationMs > MAX_LEASE_MS
    ) {
      throw new RangeError('Invalid notification outbox heartbeat lease duration')
    }

    const result = await db
      .from('notification_outbox')
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

  async acknowledge(input: NotificationOutboxLeaseMutationInput): Promise<boolean> {
    const result = await db
      .from('notification_outbox')
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

  async retry(input: NotificationOutboxRetryInput): Promise<boolean> {
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

  async deadLetter(input: NotificationOutboxFailureInput): Promise<boolean> {
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
    selector: NotificationOutboxReplaySelector,
    now: Date,
    trx: TransactionClientContract
  ): Promise<NotificationOutboxReplayRow[]> {
    return replayNotificationOutboxDeadLetters(selector, now, trx)
  }

  async previewDeadLetters(
    input: NotificationOutboxDeadLetterPreviewInput
  ): Promise<NotificationOutboxDeadLetterPreviewPage> {
    return previewNotificationOutboxDeadLetters(input)
  }

  async discardDeadLetters(
    input: {
      ids: string[]
      actorId: string
      reason: string
      now: Date
    },
    trx: TransactionClientContract
  ): Promise<NotificationOutboxDiscardRow[]> {
    return discardNotificationOutboxDeadLetters(input, trx)
  }

  async operationalStatus(
    now: Date = new Date(),
    countLimit?: number
  ): Promise<NotificationOutboxOperationalStatus> {
    return queryNotificationOutboxOperationalStatus(now, countLimit)
  }

  private async applyFailure(
    input: NotificationOutboxFailureInput,
    update: Record<string, unknown>
  ): Promise<boolean> {
    const result = await db
      .from('notification_outbox')
      .where('id', input.jobId)
      .where('lease_token', input.leaseToken)
      .where('status', 'leased')
      .where('locked_until', '>', input.now)
      .update(update)

    return affectedRowCount(result) === 1
  }
}
