import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import { NotificationCanonicalStateError } from '#modules/notifications/domain/notification-feed/notification_contract_errors'
import { NOTIFICATION_TOMBSTONE_RETENTION_MS } from '#modules/notifications/domain/notification-outbox/notification_retention_policy'
import { acquireNotificationProjectionWriterFence } from '#modules/notifications/infra/repositories/notification-outbox/notification_projection_fence'

export interface ExpiredNotificationRow {
  id: string
  event_id: string
  user_id: string
  is_read: boolean
  revision: number | string
}

export interface RecipientStateRow {
  recipient_id: string
  unread_count: number | string
  revision: number | string
}

export async function expireOneRecipient(now: Date, limit: number): Promise<number> {
  return db.transaction(async (trx) => {
    await acquireNotificationProjectionWriterFence(trx)
    const stateResult: unknown = await trx.rawQuery(
      `
        SELECT state.recipient_id, state.unread_count, state.revision
        FROM notification_recipient_states AS state
        WHERE EXISTS (
          SELECT 1
          FROM notifications AS notification
          WHERE notification.user_id = state.recipient_id
            AND notification.retention_until <= ?
        )
        ORDER BY state.recipient_id
        FOR UPDATE OF state SKIP LOCKED
        LIMIT 1
      `,
      [now]
    )
    const state = (stateResult as { rows?: RecipientStateRow[] }).rows?.[0]
    if (!state) {
      return 0
    }

    const rows = (await trx
      .from('notifications')
      .select('id', 'event_id', 'user_id', 'is_read', 'revision')
      .where('user_id', state.recipient_id)
      .where('retention_until', '<=', now)
      .orderBy('id', 'asc')
      .limit(limit)
      .forUpdate()
      .skipLocked()) as ExpiredNotificationRow[]
    if (rows.length === 0) {
      return 0
    }

    const projections = rows.map((row) => ({
      notificationId: row.id,
      sourceEventId: row.event_id,
      revision: Number(row.revision) + 1,
    }))
    await trx.table('notification_tombstones').insert(
      projections.map((projection) => ({
        notification_id: projection.notificationId,
        recipient_id: state.recipient_id,
        final_revision: projection.revision,
        deleted_at: now,
        purge_after: new Date(now.getTime() + NOTIFICATION_TOMBSTONE_RETENTION_MS),
      }))
    )
    await trx
      .from('notification_acceptance_ledger')
      .whereIn(
        'notification_id',
        rows.map((row) => row.id)
      )
      .update({
        terminal_state: 'deleted',
        terminal_at: now,
      })

    const unreadRemoved = rows.filter((row) => !row.is_read).length
    const recipientRevision = Number(state.revision) + 1
    const unreadCount = Math.max(0, Number(state.unread_count) - unreadRemoved)
    const updated = await trx
      .from('notification_recipient_states')
      .where('recipient_id', state.recipient_id)
      .where('revision', Number(state.revision))
      .update({
        unread_count: unreadCount,
        revision: recipientRevision,
        updated_at: now,
      })
    if (Number(updated) !== 1) {
      throw new NotificationCanonicalStateError(
        `Notification recipient state changed without its retention lock for ${state.recipient_id}`
      )
    }

    const operationId = randomUUID()
    await trx.table('notification_outbox').insert([
      ...projections.map((projection) => ({
        notification_id: projection.notificationId,
        operation_id: operationId,
        source_event_id: projection.sourceEventId,
        event_kind: 'notification_tombstone',
        revision: projection.revision,
        projection_revision: projection.revision,
        destination: 'feed_search',
        partition_key: projection.notificationId,
        recipient_id: state.recipient_id,
        recipient_state_revision: recipientRevision,
        payload: {
          notificationId: projection.notificationId,
          recipientId: state.recipient_id,
          revision: projection.revision,
          deleted: true,
        },
      })),
      {
        notification_id: null,
        operation_id: operationId,
        source_event_id: randomUUID(),
        event_kind: 'unread_absolute',
        revision: recipientRevision,
        projection_revision: recipientRevision,
        destination: 'unread_cache',
        partition_key: state.recipient_id,
        recipient_id: state.recipient_id,
        recipient_state_revision: recipientRevision,
        payload: {
          recipientId: state.recipient_id,
          count: unreadCount,
          revision: recipientRevision,
        },
      },
    ])
    await trx
      .from('notifications')
      .where('user_id', state.recipient_id)
      .whereIn(
        'id',
        rows.map((row) => row.id)
      )
      .delete()

    return rows.length
  })
}
