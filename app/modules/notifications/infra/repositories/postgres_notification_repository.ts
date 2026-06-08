import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import type {
  NotificationCreateData,
  NotificationRecord,
  NotificationRepository,
} from '#modules/notifications/infra/repositories/notification_repository_interface'

interface NotificationRow {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: Date
  updated_at: Date | null
  read_at: Date | null
}

export default class PostgresNotificationRepository implements NotificationRepository {
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

    const row = (await db.from('notifications').where('id', id).first()) as NotificationRow | undefined
    return row ? this.toRecord(row) : null
  }

  async findByUser(
    userId: string,
    options?: { isRead?: boolean; limit?: number; page?: number }
  ): Promise<{ data: NotificationRecord[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit
    let baseQuery = db.from('notifications').where('user_id', userId)

    if (options?.isRead !== undefined) {
      baseQuery = baseQuery.where('is_read', options.isRead)
    }

    const rows = (await baseQuery.clone().orderBy('created_at', 'desc').offset(offset).limit(limit)) as
      | NotificationRow[]
    const totalResult = (await baseQuery.clone().count('* as count').first()) as
      | { count?: number | string }
      | undefined

    return {
      data: rows.map((row) => this.toRecord(row)),
      total: Number(totalResult?.count ?? 0),
    }
  }

  async markAsRead(notificationId: string, userId?: string): Promise<boolean> {
    let query = db.from('notifications').where('id', notificationId)
    if (userId !== undefined) {
      query = query.where('user_id', userId)
    }

    const affected = Number(await query.update({
      is_read: true,
      read_at: new Date(),
      updated_at: new Date(),
    }))

    return affected > 0
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db
      .from('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date(),
      })
  }

  async delete(notificationId: string, userId?: string): Promise<boolean> {
    let query = db.from('notifications').where('id', notificationId)
    if (userId !== undefined) {
      query = query.where('user_id', userId)
    }

    const affected = Number(await query.delete())
    return affected > 0
  }

  async deleteAllRead(userId: string): Promise<void> {
    await db.from('notifications').where('user_id', userId).where('is_read', true).delete()
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
      user_id: row.user_id,
      title: row.title,
      message: row.message,
      is_read: row.is_read,
      type: row.type,
      related_entity_type: row.related_entity_type,
      related_entity_id: row.related_entity_id,
      metadata: row.metadata,
      created_at: new Date(row.created_at),
      updated_at: row.updated_at ? new Date(row.updated_at) : null,
      read_at: row.read_at ? new Date(row.read_at) : null,
    }
  }
}
