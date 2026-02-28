import Notification from '#models/notification'
import loggerService from '#services/logger_service'
import type {
  NotificationCreateData,
  NotificationRecord,
  NotificationRepository,
} from '#repositories/interfaces'
import type { DatabaseId } from '#types/database'
import { PAGINATION } from '#constants/common_constants'

/**
 * MySQL/PostgreSQL Notification Repository — Lucid ORM implementation.
 */
export default class MysqlNotificationRepository implements NotificationRepository {
  async create(data: NotificationCreateData): Promise<NotificationRecord | null> {
    try {
      const notification = await Notification.create({
        user_id: String(data.user_id),
        title: data.title,
        message: data.message,
        type: data.type,
        related_entity_type: data.related_entity_type ?? null,
        related_entity_id: data.related_entity_id ? String(data.related_entity_id) : null,
      })

      return this.toRecord(notification)
    } catch (error) {
      loggerService.error('MysqlNotificationRepository.create failed', {
        userId: data.user_id,
        type: data.type,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  async findByUser(
    userId: DatabaseId,
    options?: { isRead?: boolean; limit?: number; page?: number }
  ): Promise<{ data: NotificationRecord[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? PAGINATION.DEFAULT_PER_PAGE

    const qb = Notification.query().where('user_id', userId).orderBy('created_at', 'desc')

    if (options?.isRead !== undefined) {
      void qb.where('is_read', options.isRead)
    }

    const result = await qb.paginate(page, limit)

    return {
      data: result.all().map((row) => this.toRecord(row)),
      total: result.total,
    }
  }

  async markAsRead(notificationId: DatabaseId): Promise<void> {
    await Notification.query().where('id', notificationId).update({ is_read: true })
  }

  async markAllAsRead(userId: DatabaseId): Promise<void> {
    await Notification.query()
      .where('user_id', userId)
      .where('is_read', false)
      .update({ is_read: true })
  }

  async getUnreadCount(userId: DatabaseId): Promise<number> {
    const result = await Notification.query()
      .where('user_id', userId)
      .where('is_read', false)
      .count('* as total')

    const firstRow = result[0]
    return firstRow ? Number(firstRow.$extras.total ?? 0) : 0
  }

  private toRecord(model: Notification): NotificationRecord {
    return {
      id: String(model.id),
      user_id: String(model.user_id),
      title: model.title,
      message: model.message,
      is_read: model.is_read,
      type: model.type,
      related_entity_type: model.related_entity_type ?? null,
      related_entity_id: model.related_entity_id ?? null,
      metadata: null, // MySQL model doesn't have metadata field
      created_at: model.created_at.toJSDate(),
    }
  }
}
