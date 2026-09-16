import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import {
  PostgresNotificationMutationWriter,
  type MutationNotificationRow,
} from './postgres_notification_mutation_writer.js'

import { acquireNotificationProjectionWriterFence } from '#modules/notifications/infra/repositories/notification-outbox/notification_projection_fence'

export default class PostgresNotificationMutationRepository {
  readonly #writer: PostgresNotificationMutationWriter

  constructor(writer: PostgresNotificationMutationWriter = new PostgresNotificationMutationWriter()) {
    this.#writer = writer
  }

  async markAsRead(notificationId: string, userId?: string): Promise<boolean> {
    return db.transaction(async (trx) => {
      await acquireNotificationProjectionWriterFence(trx)
      const candidate = await this.#writer.findCandidate(trx, notificationId, userId)
      if (!candidate) {
        return false
      }

      const state = await this.#writer.lockRecipientState(trx, candidate.user_id)
      const notification = await this.#writer.lockNotification(trx, notificationId, candidate.user_id)
      if (!notification) {
        return false
      }
      if (notification.is_read) {
        return true
      }

      const now = new Date()
      const nextNotificationRevision = Number(notification.revision) + 1
      await trx
        .from('notifications')
        .where('id', notification.id)
        .where('user_id', notification.user_id)
        .where('is_read', false)
        .update({
          is_read: true,
          read_at: now,
          updated_at: now,
          revision: nextNotificationRevision,
        })

      const recipient = await this.#writer.updateRecipientState(
        trx,
        state,
        Math.max(0, Number(state.unread_count) - 1),
        now
      )
      await this.#writer.appendProjectionJobs(trx, {
        operationId: randomUUID(),
        recipientId: notification.user_id,
        recipientStateRevision: recipient.revision,
        unreadCount: recipient.unreadCount,
        projections: [
          {
            notificationId: notification.id,
            recipientId: notification.user_id,
            sourceEventId: notification.event_id,
            notificationRevision: nextNotificationRevision,
            eventKind: 'notification_upsert',
          },
        ],
      })
      return true
    })
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db.transaction(async (trx) => {
      await acquireNotificationProjectionWriterFence(trx)
      const state = await this.#writer.lockRecipientState(trx, userId)
      const rows = (await trx
        .from('notifications')
        .select('id', 'event_id', 'revision')
        .where('user_id', userId)
        .where('is_read', false)
        .orderBy('id', 'asc')
        .forUpdate()) as Pick<MutationNotificationRow, 'id' | 'event_id' | 'revision'>[]

      if (rows.length === 0) {
        return
      }

      const now = new Date()
      const updatedRows = (await trx
        .from('notifications')
        .whereIn(
          'id',
          rows.map((row) => row.id)
        )
        .where('user_id', userId)
        .where('is_read', false)
        .update({
          is_read: true,
          read_at: now,
          updated_at: now,
          revision: trx.raw('revision + 1'),
        })
        .returning(['id', 'event_id', 'revision'])) as Pick<
        MutationNotificationRow,
        'id' | 'event_id' | 'revision'
      >[]

      const recipient = await this.#writer.updateRecipientState(
        trx,
        state,
        Math.max(0, Number(state.unread_count) - updatedRows.length),
        now
      )
      await this.#writer.appendProjectionJobs(trx, {
        operationId: randomUUID(),
        recipientId: userId,
        recipientStateRevision: recipient.revision,
        unreadCount: recipient.unreadCount,
        projections: updatedRows.map((row) => ({
          notificationId: row.id,
          recipientId: userId,
          sourceEventId: row.event_id,
          notificationRevision: Number(row.revision),
          eventKind: 'notification_upsert',
        })),
      })
    })
  }

  async delete(notificationId: string, userId?: string): Promise<boolean> {
    return db.transaction(async (trx) => {
      await acquireNotificationProjectionWriterFence(trx)
      const candidate = await this.#writer.findCandidate(trx, notificationId, userId)
      if (!candidate) {
        return false
      }

      const state = await this.#writer.lockRecipientState(trx, candidate.user_id)
      const notification = await this.#writer.lockNotification(trx, notificationId, candidate.user_id)
      if (!notification) {
        return false
      }

      const now = new Date()
      const projections = await this.#writer.persistTombstones(trx, [notification], now)
      const unreadCount = notification.is_read
        ? Number(state.unread_count)
        : Math.max(0, Number(state.unread_count) - 1)
      const recipient = await this.#writer.updateRecipientState(trx, state, unreadCount, now)

      await this.#writer.appendProjectionJobs(trx, {
        operationId: randomUUID(),
        recipientId: notification.user_id,
        recipientStateRevision: recipient.revision,
        unreadCount: recipient.unreadCount,
        projections,
      })
      await trx
        .from('notifications')
        .where('id', notification.id)
        .where('user_id', notification.user_id)
        .delete()

      return true
    })
  }

  async deleteAllRead(userId: string): Promise<void> {
    await db.transaction(async (trx) => {
      await acquireNotificationProjectionWriterFence(trx)
      const state = await this.#writer.lockRecipientState(trx, userId)
      const rows = (await trx
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
        .where('user_id', userId)
        .where('is_read', true)
        .orderBy('id', 'asc')
        .forUpdate()) as MutationNotificationRow[]

      if (rows.length === 0) {
        return
      }

      const now = new Date()
      const projections = await this.#writer.persistTombstones(trx, rows, now)
      const recipient = await this.#writer.updateRecipientState(
        trx,
        state,
        Number(state.unread_count),
        now
      )
      await this.#writer.appendProjectionJobs(trx, {
        operationId: randomUUID(),
        recipientId: userId,
        recipientStateRevision: recipient.revision,
        unreadCount: recipient.unreadCount,
        projections,
      })
      await trx
        .from('notifications')
        .whereIn(
          'id',
          rows.map((row) => row.id)
        )
        .where('user_id', userId)
        .delete()
    })
  }
}
