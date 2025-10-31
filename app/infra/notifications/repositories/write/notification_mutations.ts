import { toNotificationRecord, type NotificationLeanDoc } from '../read/shared.js'

import loggerService from '#infra/logger/logger_service'
import MongoNotification from '#infra/notifications/models/notification'
import type {
  NotificationCreateData,
  NotificationRecord,
} from '#infra/notifications/repositories/notification_repository_interface'
import type { DatabaseId } from '#types/database'


export const create = async (
  data: NotificationCreateData
): Promise<NotificationRecord | null> => {
  try {
    const doc = await new MongoNotification({
      user_id: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type,
      related_entity_type: data.related_entity_type ?? undefined,
      related_entity_id: data.related_entity_id ?? undefined,
      metadata: data.metadata ?? undefined,
    }).save()

    const lean = doc.toObject() as unknown as NotificationLeanDoc
    return toNotificationRecord(lean)
  } catch (error) {
    loggerService.error('MongoNotificationRepository.create failed', {
      userId: data.user_id,
      type: data.type,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export const markAsRead = async (
  notificationId: DatabaseId,
  userId?: DatabaseId
): Promise<boolean> => {
  const filter = {
    _id: notificationId,
    ...(userId !== undefined ? { user_id: userId } : {}),
  } as unknown as Parameters<(typeof MongoNotification)['updateOne']>[0]

  const result = await MongoNotification.updateOne(filter, {
    $set: { is_read: true, read_at: new Date() },
  }).exec()

  return result.modifiedCount > 0 || result.matchedCount > 0
}

export const markAllAsRead = async (userId: DatabaseId): Promise<void> => {
  const filter = { user_id: userId, is_read: false } as unknown as Parameters<
    (typeof MongoNotification)['updateMany']
  >[0]
  await MongoNotification.updateMany(filter, {
    $set: { is_read: true, read_at: new Date() },
  }).exec()
}

export const deleteNotification = async (
  notificationId: DatabaseId,
  userId?: DatabaseId
): Promise<boolean> => {
  const filter = {
    _id: notificationId,
    ...(userId !== undefined ? { user_id: userId } : {}),
  } as unknown as Parameters<(typeof MongoNotification)['deleteOne']>[0]

  const result = await MongoNotification.deleteOne(filter).exec()
  return result.deletedCount > 0
}

export const deleteAllRead = async (userId: DatabaseId): Promise<void> => {
  const filter = {
    user_id: userId,
    is_read: true,
  } as unknown as Parameters<(typeof MongoNotification)['deleteMany']>[0]
  await MongoNotification.deleteMany(filter).exec()
}
