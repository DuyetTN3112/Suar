import db from '@adonisjs/lucid/services/db'

import type { NotificationUnreadStateReader } from '#modules/notifications/actions/ports/outbound/notification_unread_state'

export class PostgresNotificationUnreadStateReader implements NotificationUnreadStateReader {
  async read(recipientId: string): Promise<{ count: number; revision: number }> {
    const state = (await db
      .from('notification_recipient_states')
      .select('unread_count', 'revision')
      .where('recipient_id', recipientId)
      .first()) as
      | { unread_count: number | string; revision: number | string }
      | undefined
    if (state) {
      return {
        count: Number(state.unread_count),
        revision: Number(state.revision),
      }
    }

    const aggregate = (await db
      .from('notifications')
      .where('user_id', recipientId)
      .where('is_read', false)
      .count('* as count')
      .first()) as { count?: number | string } | undefined
    return {
      count: Number(aggregate?.count ?? 0),
      revision: 0,
    }
  }
}
