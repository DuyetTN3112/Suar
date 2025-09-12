
import type { NotificationRepository } from './notification_repository_interface.js'
import PostgresNotificationRepository from './postgres_notification_repository.js'

import loggerService from '#modules/logger/public_contracts/logger_service'

let notificationRepo: NotificationRepository | null = null

export function getNotificationRepository(): NotificationRepository {
  if (notificationRepo) return notificationRepo

  notificationRepo = new PostgresNotificationRepository()
  loggerService.info('Notification repository initialized: postgres')
  return notificationRepo
}

export const notificationRepositoryProvider = {
  getNotificationRepository,
} as const
