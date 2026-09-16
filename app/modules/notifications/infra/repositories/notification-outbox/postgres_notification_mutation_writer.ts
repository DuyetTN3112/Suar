import { randomUUID } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { NotificationCanonicalStateError } from '#modules/notifications/domain/notification-feed/notification_contract_errors'

export interface MutationNotificationRow {
  id: string
  event_id: string
  event_fingerprint: string
  user_id: string
  type: string
  dedupe_key: string | null
  occurred_at: Date
  is_read: boolean
  revision: number | string
}

export interface RecipientStateRow {
  recipient_id: string
  unread_count: number | string
  revision: number | string
}

export interface MutationProjection {
  notificationId: string
  recipientId: string
  sourceEventId: string
  notificationRevision: number
  eventKind: 'notification_upsert' | 'notification_tombstone'
}

const TOMBSTONE_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000

export class PostgresNotificationMutationWriter {
  async findCandidate(
    trx: TransactionClientContract,
    notificationId: string,
    userId?: string
  ): Promise<{ user_id: string } | undefined> {
    let query = trx.from('notifications').select('user_id').where('id', notificationId)
    if (userId !== undefined) {
      query = query.where('user_id', userId)
    }
    return (await query.first()) as { user_id: string } | undefined
  }

  async lockRecipientState(
    trx: TransactionClientContract,
    recipientId: string
  ): Promise<RecipientStateRow> {
    const aggregate = (await trx
      .from('notifications')
      .where('user_id', recipientId)
      .where('is_read', false)
      .count('* as count')
      .first()) as { count?: number | string } | undefined

    await trx
      .table('notification_recipient_states')
      .insert({
        recipient_id: recipientId,
        unread_count: Number(aggregate?.count ?? 0),
        revision: 0,
      })
      .onConflict('recipient_id')
      .ignore()

    const state = (await trx
      .from('notification_recipient_states')
      .where('recipient_id', recipientId)
      .forUpdate()
      .first()) as RecipientStateRow | undefined

    if (!state) {
      throw new NotificationCanonicalStateError(
        `Unable to lock notification recipient state for ${recipientId}`
      )
    }
    return state
  }

  async lockNotification(
    trx: TransactionClientContract,
    notificationId: string,
    recipientId: string
  ): Promise<MutationNotificationRow | undefined> {
    return (await trx
      .from('notifications')
      .select(
        'id',
        'event_id',
        'event_fingerprint',
        'user_id',
        'type',
        'dedupe_key',
        'occurred_at',
        'is_read',
        'revision'
      )
      .where('id', notificationId)
      .where('user_id', recipientId)
      .forUpdate()
      .first()) as MutationNotificationRow | undefined
  }

  async updateRecipientState(
    trx: TransactionClientContract,
    state: RecipientStateRow,
    unreadCount: number,
    now: Date
  ): Promise<{ unreadCount: number; revision: number }> {
    const nextRevision = Number(state.revision) + 1
    const [updated] = (await trx
      .from('notification_recipient_states')
      .where('recipient_id', state.recipient_id)
      .update({
        unread_count: unreadCount,
        revision: nextRevision,
        updated_at: now,
      })
      .returning(['unread_count', 'revision'])) as {
      unread_count: number | string
      revision: number | string
    }[]

    if (!updated) {
      throw new NotificationCanonicalStateError(
        `Unable to update notification recipient state for ${state.recipient_id}`
      )
    }
    return {
      unreadCount: Number(updated.unread_count),
      revision: Number(updated.revision),
    }
  }

  async appendProjectionJobs(
    trx: TransactionClientContract,
    input: {
      operationId: string
      recipientId: string
      recipientStateRevision: number
      unreadCount: number
      projections: MutationProjection[]
    }
  ): Promise<void> {
    const feedJobs = input.projections.map((projection) => ({
      notification_id: projection.notificationId,
      operation_id: input.operationId,
      source_event_id: projection.sourceEventId,
      event_kind: projection.eventKind,
      revision: projection.notificationRevision,
      projection_revision: projection.notificationRevision,
      destination: 'feed_search',
      partition_key: projection.notificationId,
      recipient_id: input.recipientId,
      recipient_state_revision: input.recipientStateRevision,
      payload:
        projection.eventKind === 'notification_tombstone'
          ? {
              notificationId: projection.notificationId,
              recipientId: input.recipientId,
              revision: projection.notificationRevision,
              deleted: true,
            }
          : {
              notificationId: projection.notificationId,
              recipientId: input.recipientId,
              revision: projection.notificationRevision,
            },
    }))

    await trx.table('notification_outbox').insert([
      ...feedJobs,
      {
        notification_id: null,
        operation_id: input.operationId,
        source_event_id: randomUUID(),
        event_kind: 'unread_absolute',
        revision: input.recipientStateRevision,
        projection_revision: input.recipientStateRevision,
        destination: 'unread_cache',
        partition_key: input.recipientId,
        recipient_id: input.recipientId,
        recipient_state_revision: input.recipientStateRevision,
        payload: {
          recipientId: input.recipientId,
          count: input.unreadCount,
          revision: input.recipientStateRevision,
        },
      },
    ])
  }

  async persistTombstones(
    trx: TransactionClientContract,
    rows: MutationNotificationRow[],
    now: Date
  ): Promise<MutationProjection[]> {
    const projections = rows.map((row) => ({
      notificationId: row.id,
      recipientId: row.user_id,
      sourceEventId: row.event_id,
      notificationRevision: Number(row.revision) + 1,
      eventKind: 'notification_tombstone' as const,
    }))

    await trx.table('notification_tombstones').insert(
      projections.map((projection) => ({
        notification_id: projection.notificationId,
        recipient_id: projection.recipientId,
        final_revision: projection.notificationRevision,
        deleted_at: now,
        purge_after: new Date(now.getTime() + TOMBSTONE_RETENTION_MS),
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

    return projections
  }
}
