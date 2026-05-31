import db from '@adonisjs/lucid/services/db'

import type {
  NotificationCanonicalFeedPage,
  NotificationCanonicalFeedReadInput,
  NotificationCanonicalFeedReader,
} from '#modules/notifications/actions/ports/outbound/notification-feed/notification_feed_readers'
import type { NotificationRecord } from '#modules/notifications/actions/ports/outbound/notification_repository'
import type { NotificationActionDescriptor } from '#modules/notifications/domain/notification-feed/notification_catalog'
import { NotificationFeedCursorError } from '#modules/notifications/domain/notification-feed/notification_contract_errors'
import type { NotificationFeedCursorCodec } from '#modules/notifications/infra/adapters/notification-feed/notification_feed_cursor_codec'

interface NotificationFeedRow {
  id: string
  event_id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata: Record<string, unknown> | null
  schema_version: number | string
  category: string
  priority: string
  action: NotificationActionDescriptor | null
  revision: number | string
  occurred_at: Date
  created_at: Date
  updated_at: Date | null
  read_at: Date | null
}

function toRecord(row: NotificationFeedRow): NotificationRecord {
  return {
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id,
    title: row.title,
    message: row.message,
    is_read: row.is_read,
    type: row.type,
    related_entity_type: row.related_entity_type,
    related_entity_id: row.related_entity_id,
    metadata: null,
    schema_version: Number(row.schema_version),
    category: row.category,
    priority: row.priority,
    action: row.action,
    revision: Number(row.revision),
    occurred_at: new Date(row.occurred_at),
    created_at: new Date(row.created_at),
    updated_at: row.updated_at ? new Date(row.updated_at) : null,
    read_at: row.read_at ? new Date(row.read_at) : null,
  }
}

export class PostgresNotificationCanonicalFeedReader implements NotificationCanonicalFeedReader {
  constructor(private readonly cursorCodec: NotificationFeedCursorCodec) {}

  async read(input: NotificationCanonicalFeedReadInput): Promise<NotificationCanonicalFeedPage> {
    const after = input.after
      ? this.cursorCodec.decode(input.after, {
          direction: 'after',
          recipientId: input.recipientId,
          unreadOnly: input.unreadOnly,
        })
      : null
    const before = input.before
      ? this.cursorCodec.decode(input.before, {
          direction: 'before',
          recipientId: input.recipientId,
          unreadOnly: input.unreadOnly,
        })
      : null
    if ((input.after && !after) || (input.before && !before) || (after && before)) {
      throw new NotificationFeedCursorError()
    }

    let query = db.from('notifications').where('user_id', input.recipientId)
    if (input.unreadOnly) {
      query = query.where('is_read', false)
    }
    const countQuery = query.clone()
    const isBeforeWindow = before !== null
    if (after) {
      query = query.where((builder) => {
        void builder.where('created_at', '<', after.createdAt).orWhere((nested) => {
          void nested.where('created_at', after.createdAt).where('id', '<', after.notificationId)
        })
      })
    } else if (before) {
      query = query.where((builder) => {
        void builder.where('created_at', '>', before.createdAt).orWhere((nested) => {
          void nested.where('created_at', before.createdAt).where('id', '>', before.notificationId)
        })
      })
    } else if (input.page > 1) {
      query = query.offset((input.page - 1) * input.limit)
    }

    const rows = (await query
      .orderBy('created_at', isBeforeWindow ? 'asc' : 'desc')
      .orderBy('id', isBeforeWindow ? 'asc' : 'desc')
      .limit(input.limit + 1)) as NotificationFeedRow[]
    const overflow = rows.length > input.limit
    const windowRows = overflow ? rows.slice(0, input.limit) : rows
    const pageRows = isBeforeWindow ? [...windowRows].reverse() : windowRows
    const first = pageRows[0]
    const last = pageRows.at(-1)
    const totalRow = input.includeTotal
      ? ((await countQuery.count('* as count').first()) as { count?: number | string } | undefined)
      : undefined

    return {
      data: pageRows.map(toRecord),
      total: input.includeTotal ? Number(totalRow?.count ?? 0) : null,
      nextCursor:
        (isBeforeWindow || overflow) && last
          ? this.cursorCodec.encode({
              direction: 'after',
              createdAt: last.created_at.toISOString(),
              notificationId: last.id,
              recipientId: input.recipientId,
              unreadOnly: input.unreadOnly,
            })
          : null,
      previousCursor:
        (isBeforeWindow ? overflow : Boolean(after)) && first
          ? this.cursorCodec.encode({
              direction: 'before',
              createdAt: first.created_at.toISOString(),
              notificationId: first.id,
              recipientId: input.recipientId,
              unreadOnly: input.unreadOnly,
            })
          : null,
      hasNextPage: isBeforeWindow ? Boolean(before) : overflow,
      hasPreviousPage: isBeforeWindow ? overflow : Boolean(after) || input.page > 1,
    }
  }
}
