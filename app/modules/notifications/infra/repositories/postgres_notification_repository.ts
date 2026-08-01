import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import type {
  NotificationCreateData,
  NotificationRecord,
  NotificationRepository,
} from '#modules/notifications/actions/ports/outbound/notification_repository'
import type { NotificationActionDescriptor } from '#modules/notifications/domain/notification_catalog'
import PostgresNotificationMutationRepository from '#modules/notifications/infra/repositories/postgres_notification_mutation_repository'
import {
  decodeTimestampCursor,
  encodeTimestampCursor,
  toOffset,
} from '#modules/pagination/public_contracts/pagination_public_api'
interface NotificationRow {
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

export default class PostgresNotificationRepository implements NotificationRepository {
  private readonly mutations = new PostgresNotificationMutationRepository()

  async create(data: NotificationCreateData): Promise<NotificationRecord | null> {
    const id = randomUUID()

    await db.table('notifications').insert({
      id,
      user_id: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type,
      related_entity_type: data.related_entity_type ?? null,
      related_entity_id: data.related_entity_id ?? null,
      metadata: data.metadata ?? null,
    })

    const row = (await db.from('notifications').where('id', id).first()) as
      | NotificationRow
      | undefined
    return row ? this.toRecord(row) : null
  }

  async findByUser(
    userId: string,
    options?: { isRead?: boolean; limit?: number; page?: number }
  ): Promise<{ data: NotificationRecord[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = toOffset(page, limit)
    let baseQuery = db.from('notifications').where('user_id', userId)

    if (options?.isRead !== undefined) {
      baseQuery = baseQuery.where('is_read', options.isRead)
    }

    const rows = (await baseQuery
      .clone()
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit)) as NotificationRow[]
    const totalResult = (await baseQuery.clone().count('* as count').first()) as
      | { count?: number | string }
      | undefined

    return {
      data: rows.map((row) => this.toRecord(row)),
      total: Number(totalResult?.count ?? 0),
    }
  }

  async findByUserCursor(
    userId: string,
    options?: { isRead?: boolean; limit?: number; after?: string | null; before?: string | null }
  ): Promise<{
    data: NotificationRecord[]
    nextCursor: string | null
    previousCursor: string | null
    hasNextPage: boolean
    hasPreviousPage: boolean
  }> {
    const limit = Math.max(1, options?.limit ?? 10)
    let baseQuery = db.from('notifications').where('user_id', userId)

    if (options?.isRead !== undefined) {
      baseQuery = baseQuery.where('is_read', options.isRead)
    }

    const decodedCursor = decodeTimestampCursor(options?.after)
    const decodedBeforeCursor = decodeTimestampCursor(options?.before)
    const isBeforeWindow = Boolean(decodedBeforeCursor && !decodedCursor)

    if (decodedCursor) {
      baseQuery = baseQuery.where((builder) => {
        void builder.where('created_at', '<', decodedCursor.createdAt).orWhere((nested) => {
          void nested
            .where('created_at', decodedCursor.createdAt)
            .where('id', '<', decodedCursor.id)
        })
      })
    } else if (decodedBeforeCursor) {
      baseQuery = baseQuery.where((builder) => {
        void builder.where('created_at', '>', decodedBeforeCursor.createdAt).orWhere((nested) => {
          void nested
            .where('created_at', decodedBeforeCursor.createdAt)
            .where('id', '>', decodedBeforeCursor.id)
        })
      })
    }

    const rows = (await baseQuery
      .clone()
      .orderBy('created_at', isBeforeWindow ? 'asc' : 'desc')
      .orderBy('id', isBeforeWindow ? 'asc' : 'desc')
      .limit(limit + 1)) as NotificationRow[]

    const hasOverflow = rows.length > limit
    const windowRows = hasOverflow ? rows.slice(0, limit) : rows
    const pageRows = isBeforeWindow ? [...windowRows].reverse() : windowRows
    const firstRow = pageRows[0]
    const lastRow = pageRows[pageRows.length - 1]

    return {
      data: pageRows.map((row) => this.toRecord(row)),
      nextCursor:
        (isBeforeWindow || hasOverflow) && lastRow
          ? encodeTimestampCursor({
              createdAt: lastRow.created_at.toISOString(),
              id: lastRow.id,
            })
          : null,
      previousCursor:
        (decodedCursor || isBeforeWindow) && firstRow
          ? encodeTimestampCursor({
              createdAt: firstRow.created_at.toISOString(),
              id: firstRow.id,
            })
          : null,
      hasNextPage: isBeforeWindow ? Boolean(decodedBeforeCursor) : hasOverflow,
      hasPreviousPage: isBeforeWindow ? hasOverflow : Boolean(decodedCursor),
    }
  }

  async markAsRead(notificationId: string, userId?: string): Promise<boolean> {
    return this.mutations.markAsRead(notificationId, userId)
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.mutations.markAllAsRead(userId)
  }

  async delete(notificationId: string, userId?: string): Promise<boolean> {
    return this.mutations.delete(notificationId, userId)
  }

  async deleteAllRead(userId: string): Promise<void> {
    await this.mutations.deleteAllRead(userId)
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = (await db
      .from('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .count('* as count')
      .first()) as { count?: number | string } | undefined

    return Number(result?.count ?? 0)
  }

  private toRecord(row: NotificationRow): NotificationRecord {
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
      metadata: row.metadata,
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
}
