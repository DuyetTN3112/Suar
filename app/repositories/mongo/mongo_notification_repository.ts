import MongoNotification from '#models/mongo/notification'
import loggerService from '#services/logger_service'
import type {
  NotificationCreateData,
  NotificationRecord,
  NotificationRepository,
} from '#repositories/interfaces'
import type { DatabaseId } from '#types/database'
import { PAGINATION } from '#constants/common_constants'
import type { Types } from 'mongoose'

/** Shape of a lean notification document from MongoDB */
interface NotificationLeanDoc {
  _id: Types.ObjectId
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type?: string
  related_entity_id?: string
  metadata?: Record<string, unknown>
  created_at?: Date
}

/**
 * MongoDB Notification Repository — Mongoose implementation.
 *
 * Optimized for high-frequency writes, user-scoped reads, auto-expiry (TTL 90 days).
 */
export default class MongoNotificationRepository implements NotificationRepository {
  async create(data: NotificationCreateData): Promise<NotificationRecord | null> {
    try {
      const doc = await new MongoNotification({
        user_id: String(data.user_id),
        title: data.title,
        message: data.message,
        type: data.type,
        related_entity_type: data.related_entity_type ?? undefined,
        related_entity_id: data.related_entity_id ? String(data.related_entity_id) : undefined,
        metadata: data.metadata ?? undefined,
      }).save()

      const lean = doc.toObject() as unknown as NotificationLeanDoc
      return this.toRecord(lean)
    } catch (error) {
      loggerService.error('MongoNotificationRepository.create failed', {
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
    const skip = (page - 1) * limit

    const filter: Record<string, string | boolean> = { user_id: String(userId) }
    if (options?.isRead !== undefined) {
      filter.is_read = options.isRead
    }

    // Cast needed because Mongoose strict types don't accept Record<string, string | boolean>
    const mongoFilter = filter as unknown as Parameters<(typeof MongoNotification)['find']>[0]

    const [rawDocs, total] = await Promise.all([
      MongoNotification.find(mongoFilter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      MongoNotification.countDocuments(mongoFilter).exec(),
    ])

    const docs = rawDocs as unknown as NotificationLeanDoc[]

    return {
      data: docs.map((doc) => this.toRecord(doc)),
      total,
    }
  }

  async markAsRead(notificationId: DatabaseId): Promise<void> {
    await MongoNotification.updateOne(
      { _id: String(notificationId) },
      { $set: { is_read: true } }
    ).exec()
  }

  async markAllAsRead(userId: DatabaseId): Promise<void> {
    const filter = { user_id: String(userId), is_read: false } as unknown as Parameters<
      (typeof MongoNotification)['updateMany']
    >[0]
    await MongoNotification.updateMany(filter, { $set: { is_read: true } }).exec()
  }

  async getUnreadCount(userId: DatabaseId): Promise<number> {
    const filter = {
      user_id: String(userId),
      is_read: false,
    } as unknown as Parameters<(typeof MongoNotification)['countDocuments']>[0]
    return MongoNotification.countDocuments(filter).exec()
  }

  private toRecord(doc: NotificationLeanDoc): NotificationRecord {
    return {
      id: String(doc._id),
      user_id: doc.user_id,
      title: doc.title,
      message: doc.message,
      is_read: doc.is_read,
      type: doc.type,
      related_entity_type: doc.related_entity_type ?? null,
      related_entity_id: doc.related_entity_id ?? null,
      metadata: doc.metadata ?? null,
      created_at: doc.created_at ?? new Date(),
    }
  }
}
