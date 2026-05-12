import CreateNotification, {
  type NotificationCreator,
  type NotificationData,
} from '../create_notification.js'

import type { NotificationRecord } from '#infra/notifications/repositories/notification_repository_interface'

export class NotificationPublicApi implements NotificationCreator {
  private readonly createNotification = new CreateNotification()

  async handle(data: NotificationData): Promise<NotificationRecord | null> {
    return this.create(data)
  }

  async create(data: NotificationData): Promise<NotificationRecord | null> {
    return this.createNotification.handle(data)
  }
}

export const notificationPublicApi = new NotificationPublicApi()
