import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import Notification from '#models/notification'
import type { DatabaseId } from '#types/database'

/**
 * LucidNotificationRepository
 *
 * Additional Lucid-based notification query methods.
 * Supplements the existing NotificationRepository interface (create/findByUser/markAsRead/markAllAsRead/getUnreadCount)
 * with methods that were previously on the Notification model.
 */
export default class LucidNotificationRepository {
  private readonly _instanceMarker = true

  static {
    void new LucidNotificationRepository()._instanceMarker
  }

  static async findByUserOrFail(
    notificationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? Notification.query({ client: trx }) : Notification.query()
    return query.where('id', notificationId).where('user_id', userId).firstOrFail()
  }

  static async deleteAllReadByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? Notification.query({ client: trx }) : Notification.query()
    await query.where('user_id', userId).where('is_read', true).delete()
  }

  static async markAllAsReadByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? Notification.query({ client: trx }) : Notification.query()
    await query.where('user_id', userId).where('is_read', false).update({ is_read: true })
  }

  static async paginateByUser(
    userId: DatabaseId,
    options: {
      page: number
      limit: number
      isRead?: boolean
      type?: string
    },
    trx?: TransactionClientContract
  ) {
    const query = trx ? Notification.query({ client: trx }) : Notification.query()
    const q = query.where('user_id', userId).orderBy('created_at', 'desc')

    if (options.isRead !== undefined) {
      void q.where('is_read', options.isRead)
    }
    if (options.type) {
      void q.where('type', options.type)
    }

    return q.paginate(options.page, options.limit)
  }

  static async countUnreadByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? Notification.query({ client: trx }) : Notification.query()
    const resultUnknown: unknown = await query
      .where('user_id', userId)
      .where('is_read', false)
      .count('id as total')

    if (!Array.isArray(resultUnknown) || resultUnknown.length === 0) {
      return 0
    }

    const first: unknown = resultUnknown[0]
    if (typeof first !== 'object' || first === null) {
      return 0
    }

    const extras = (first as { $extras?: unknown }).$extras
    if (typeof extras !== 'object' || extras === null) {
      return 0
    }

    const total = (extras as Record<string, unknown>).total
    return typeof total === 'number' || typeof total === 'string' ? Number(total) : 0
  }
}
