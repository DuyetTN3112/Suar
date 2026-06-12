import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
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
import {
  NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT,
  type NotificationOutboxDeadLetterPreviewInput,
  type NotificationOutboxDeadLetterPreviewPage,
  type NotificationOutboxDiscardRow,
} from '#modules/notifications/domain/notification-outbox/notification_outbox_dlq'

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
const MAX_ERROR_CLASS_LENGTH = 200

function validateReplaySelector(selector: NotificationOutboxReplaySelector): void {
  if (
    selector.ids !== undefined &&
    (selector.ids.length < 1 ||
      selector.ids.length > NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT ||
      new Set(selector.ids).size !== selector.ids.length)
  ) {
    throw new RangeError(
      `Replay selector ids must contain between 1 and ${NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT} unique values`
    )
  }
  for (const [name, value] of [
    ['fromSequence', selector.fromSequence],
    ['toSequence', selector.toSequence],
  ] as const) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
      throw new RangeError(`${name} must be a positive safe integer`)
    }
  }
  if (
    selector.fromSequence !== undefined &&
    selector.toSequence !== undefined &&
    selector.fromSequence > selector.toSequence
  ) {
    throw new RangeError('fromSequence cannot be greater than toSequence')
  }
  if (
    selector.errorClass !== undefined &&
    (selector.errorClass.length < 1 || selector.errorClass.length > MAX_ERROR_CLASS_LENGTH)
  ) {
    throw new RangeError(
      `Replay selector errorClass must contain 1 to ${MAX_ERROR_CLASS_LENGTH} characters`
    )
  }
}

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

function affectedRowCount(result: unknown): number {
  if (Array.isArray(result)) {
    return result.length
  }
  return Number(result)
}

export interface NotificationOutboxOperationalStatus {
  pending: number
  leased: number
  retryPending: number
  deadLetter: number
  processed: number
  oldestPendingAgeMs: number | null
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
    validateReplaySelector(selector)
    let query = trx
      .from('notification_outbox')
      .select('id', 'sequence')
      .where('status', 'dead_letter')

    if (selector.ids !== undefined) {
      query = query.whereIn('id', selector.ids)
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
      .limit(NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT + 1)
      .forUpdate()) as Array<{
      id: string
      sequence: number | string
    }>
    if (rows.length > NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT) {
      throw new RangeError(
        `Outbox replay selector matches more than ${NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT} rows; narrow the selector`
      )
    }
    if (rows.length === 0) {
      return []
    }

    await trx
      .from('notification_outbox')
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

  async previewDeadLetters(
    input: NotificationOutboxDeadLetterPreviewInput
  ): Promise<NotificationOutboxDeadLetterPreviewPage> {
    validateReplaySelector(input.selector)
    if (
      !Number.isSafeInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT
    ) {
      throw new RangeError(
        `Outbox DLQ preview limit must be between 1 and ${NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT}`
      )
    }
    if (
      input.afterSequence !== undefined &&
      (!Number.isSafeInteger(input.afterSequence) || input.afterSequence < 1)
    ) {
      throw new RangeError('Outbox DLQ afterSequence must be a positive safe integer')
    }

    let query = db
      .from('notification_outbox')
      .select(
        'id',
        'sequence',
        'destination',
        'attempt_count',
        'last_error_class',
        'dead_lettered_at',
        'created_at'
      )
      .where('status', 'dead_letter')

    if (input.selector.ids !== undefined) {
      query = query.whereIn('id', input.selector.ids)
    }
    if (input.selector.fromSequence !== undefined) {
      query = query.where('sequence', '>=', input.selector.fromSequence)
    }
    if (input.selector.toSequence !== undefined) {
      query = query.where('sequence', '<=', input.selector.toSequence)
    }
    if (input.selector.errorClass !== undefined) {
      query = query.where('last_error_class', input.selector.errorClass)
    }
    if (input.destination !== undefined) {
      query = query.where('destination', input.destination)
    }
    if (input.afterSequence !== undefined) {
      query = query.where('sequence', '>', input.afterSequence)
    }

    const rows = (await query.orderBy('sequence', 'asc').limit(input.limit + 1)) as Array<{
      id: string
      sequence: number | string
      destination: 'feed_search' | 'unread_cache'
      attempt_count: number | string
      last_error_class: string | null
      dead_lettered_at: Date | string | null
      created_at: Date | string
    }>
    const hasMore = rows.length > input.limit
    const pageRows = rows.slice(0, input.limit)
    const items = pageRows.map((row) => ({
      id: row.id,
      sequence: Number(row.sequence),
      destination: row.destination,
      attemptCount: Number(row.attempt_count),
      errorClass: row.last_error_class ?? 'unknown',
      deadLetteredAt: new Date(row.dead_lettered_at ?? row.created_at),
    }))

    return {
      items,
      hasMore,
      nextAfterSequence: hasMore && items.length > 0 ? (items.at(-1)?.sequence ?? null) : null,
    }
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
    validateReplaySelector({ ids: input.ids })
    const rows = (await trx
      .from('notification_outbox')
      .select('id', 'sequence', 'event_kind')
      .where('status', 'dead_letter')
      .whereIn('id', input.ids)
      .orderBy('sequence', 'asc')
      .forUpdate()) as Array<{
      id: string
      sequence: number | string
      event_kind: string
    }>

    if (rows.length !== input.ids.length) {
      throw new RangeError('Every outbox disposition id must currently reference a dead-letter row')
    }
    if (rows.some((row) => row.event_kind === 'notification_tombstone')) {
      throw new RangeError('Notification tombstones cannot be discarded before projection proof')
    }

    const result = await trx
      .from('notification_outbox')
      .where('status', 'dead_letter')
      .whereIn(
        'id',
        rows.map((row) => row.id)
      )
      .update({
        status: 'discarded',
        processed_at: input.now,
        disposed_at: input.now,
        disposed_by: input.actorId,
        disposition_reason: input.reason,
        locked_by: null,
        locked_until: null,
        lease_token: null,
        updated_at: input.now,
      })
    if (affectedRowCount(result) !== rows.length) {
      throw new InvariantViolationException(
        'Outbox disposition lost its dead-letter concurrency fence'
      )
    }

    return rows.map((row) => ({
      id: row.id,
      sequence: Number(row.sequence),
      previousStatus: 'dead_letter',
    }))
  }

  async operationalStatus(
    now: Date = new Date(),
    countLimit?: number
  ): Promise<NotificationOutboxOperationalStatus> {
    if (
      countLimit !== undefined &&
      (!Number.isSafeInteger(countLimit) || countLimit < 1 || countLimit > 10_000_000)
    ) {
      throw new RangeError('Notification outbox operational count limit is invalid')
    }
    const rawResult: unknown =
      countLimit === undefined
        ? await db.rawQuery(`
            SELECT
              COUNT(*) FILTER (WHERE status = 'pending') AS pending,
              COUNT(*) FILTER (WHERE status = 'leased') AS leased,
              COUNT(*) FILTER (
                WHERE status = 'pending' AND attempt_count > 0
              ) AS retry_pending,
              COUNT(*) FILTER (WHERE status = 'dead_letter') AS dead_letter,
              COUNT(*) FILTER (WHERE status = 'processed') AS processed,
              MIN(created_at) FILTER (
                WHERE status IN ('pending', 'leased')
              ) AS oldest_pending_at
            FROM notification_outbox
          `)
        : await db.rawQuery(
            `
              SELECT
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_outbox
                    WHERE status = 'pending'
                    LIMIT ?
                  ) AS bounded
                ) AS pending,
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_outbox
                    WHERE status = 'leased'
                    LIMIT ?
                  ) AS bounded
                ) AS leased,
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_outbox
                    WHERE status = 'pending' AND attempt_count > 0
                    LIMIT ?
                  ) AS bounded
                ) AS retry_pending,
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_outbox
                    WHERE status = 'dead_letter'
                    LIMIT ?
                  ) AS bounded
                ) AS dead_letter,
                (
                  SELECT COUNT(*) FROM (
                    SELECT 1 FROM notification_outbox
                    WHERE status = 'processed'
                    LIMIT ?
                  ) AS bounded
                ) AS processed,
                (
                  SELECT created_at
                  FROM notification_outbox
                  WHERE status IN ('pending', 'leased')
                  ORDER BY created_at
                  LIMIT 1
                ) AS oldest_pending_at
            `,
            [countLimit, countLimit, countLimit, countLimit, countLimit]
          )
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
      pending: Number(row?.pending ?? 0),
      leased: Number(row?.leased ?? 0),
      retryPending: Number(row?.retry_pending ?? 0),
      deadLetter: Number(row?.dead_letter ?? 0),
      processed: Number(row?.processed ?? 0),
      oldestPendingAgeMs:
        oldestPendingAt === null ? null : Math.max(0, now.getTime() - oldestPendingAt.getTime()),
    }
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
