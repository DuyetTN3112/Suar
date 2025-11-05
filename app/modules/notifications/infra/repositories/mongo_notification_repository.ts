import * as notificationQueries from './read/notification_queries.js'
import * as notificationMutations from './write/notification_mutations.js'

import type {
  NotificationCreateData,
  NotificationRecord,
  NotificationRepository,
} from '#modules/notifications/infra/repositories/notification_repository_interface'

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
    userId: string,
    options?: { isRead?: boolean; limit?: number; page?: number }
  ): Promise<{ data: NotificationRecord[]; total: number }> {
    return notificationQueries.findByUser(userId, options)
  }

  async markAsRead(notificationId: string, userId?: string): Promise<boolean> {
    return notificationMutations.markAsRead(notificationId, userId)
  }

  async markAllAsRead(userId: string): Promise<void> {
    await notificationMutations.markAllAsRead(userId)
  }

  async delete(notificationId: string, userId?: string): Promise<boolean> {
    return notificationMutations.deleteNotification(notificationId, userId)
  }

  async deleteAllRead(userId: string): Promise<void> {
    await notificationMutations.deleteAllRead(userId)
  }

  async getUnreadCount(userId: string): Promise<number> {
    return notificationQueries.getUnreadCount(userId)
  }
}
