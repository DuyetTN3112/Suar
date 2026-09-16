import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  NotificationOutboxReplayRow,
  NotificationOutboxReplaySelector,
} from '#modules/notifications/domain/notification-outbox/notification_outbox'
import {
  NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT,
  type NotificationOutboxDeadLetterPreviewInput,
  type NotificationOutboxDeadLetterPreviewPage,
  type NotificationOutboxDiscardRow,
} from '#modules/notifications/domain/notification-outbox/notification_outbox_dlq'

const MAX_ERROR_CLASS_LENGTH = 200

export function affectedRowCount(result: unknown): number {
  if (Array.isArray(result)) {
    return result.length
  }
  return Number(result)
}

export function validateReplaySelector(selector: NotificationOutboxReplaySelector): void {
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

export async function replayNotificationOutboxDeadLetters(
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

export async function previewNotificationOutboxDeadLetters(
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

export async function discardNotificationOutboxDeadLetters(
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
