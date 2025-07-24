
import MongoNotificationRepository from './mongo_notification_repository.js'
import type { NotificationRepository } from './notification_repository_interface.js'

import loggerService from '#infra/logger/logger_service'

let notificationRepo: NotificationRepository | null = null

export function getNotificationRepository(): NotificationRepository {
  if (notificationRepo) return notificationRepo

  notificationRepo = new MongoNotificationRepository()
  loggerService.info('Notification repository initialized: mongodb')
  return notificationRepo
}

export const notificationRepositoryProvider = {
  getNotificationRepository,
} as const
