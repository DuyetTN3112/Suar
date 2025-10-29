import * as notificationQueries from './read/notification_queries.js'
import * as notificationMutations from './write/notification_mutations.js'

import type {
  NotificationCreateData,
  NotificationRecord,
  NotificationRepository,
} from '#infra/notifications/repositories/notification_repository_interface'
import type { DatabaseId } from '#types/database'

/**
 * MongoDB Notification Repository — Mongoose implementation.
 *
 * Optimized for high-frequency writes, user-scoped reads, auto-expiry (TTL 90 days).
 */
export default class MongoNotificationRepository implements NotificationRepository {
  async create(data: NotificationCreateData): Promise<NotificationRecord | null> {
    return notificationMutations.create(data)
  }

  async findByUser(
    userId: DatabaseId,
    options?: { isRead?: boolean; limit?: number; page?: number }
  ): Promise<{ data: NotificationRecord[]; total: number }> {
    return notificationQueries.findByUser(userId, options)
  }

  async markAsRead(notificationId: DatabaseId, userId?: DatabaseId): Promise<boolean> {
    return notificationMutations.markAsRead(notificationId, userId)
  }

  async markAllAsRead(userId: DatabaseId): Promise<void> {
    await notificationMutations.markAllAsRead(userId)
  }

  async delete(notificationId: DatabaseId, userId?: DatabaseId): Promise<boolean> {
    return notificationMutations.deleteNotification(notificationId, userId)
  }

  async deleteAllRead(userId: DatabaseId): Promise<void> {
    await notificationMutations.deleteAllRead(userId)
  }

  async getUnreadCount(userId: DatabaseId): Promise<number> {
    return notificationQueries.getUnreadCount(userId)
  }
}
