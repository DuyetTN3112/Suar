import { toNotificationRecord, type NotificationLeanDoc } from './shared.js'

import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'
import MongoNotification from '#modules/notifications/infra/models/notification'
import type { NotificationRecord } from '#modules/notifications/infra/repositories/notification_repository_interface'


export const findByUser = async (
  userId: string,
  options?: { isRead?: boolean; limit?: number; page?: number }
): Promise<{ data: NotificationRecord[]; total: number }> => {
  const page = options?.page ?? 1
  const limit = options?.limit ?? PAGINATION.DEFAULT_PER_PAGE
  const skip = (page - 1) * limit

  const filter: Record<string, string | boolean> = { user_id: userId }
  if (options?.isRead !== undefined) {
    filter.is_read = options.isRead
  }

  const mongoFilter = filter as unknown as Parameters<(typeof MongoNotification)['find']>[0]

  const [rawDocs, total] = await Promise.all([
    MongoNotification.find(mongoFilter).sort({ created_at: -1 }).skip(skip).limit(limit).lean().exec(),
    MongoNotification.countDocuments(mongoFilter).exec(),
  ])

  const docs = rawDocs as unknown as NotificationLeanDoc[]

  return {
    data: docs.map((doc) => toNotificationRecord(doc)),
    total,
  }
}

export const getUnreadCount = async (userId: string): Promise<number> => {
  const filter = {
    user_id: userId,
    is_read: false,
  } as unknown as Parameters<(typeof MongoNotification)['countDocuments']>[0]
  return MongoNotification.countDocuments(filter).exec()
}
