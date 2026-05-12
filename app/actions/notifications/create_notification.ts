import type {
  BackendNotificationEntityType,
  NotificationTypeValue,
} from '#constants/notification_constants'
import type { NotificationRecord } from '#infra/notifications/repositories/notification_repository_interface'
import { notificationRepositoryProvider } from '#infra/notifications/repositories/notification_repository_provider'
import type { DatabaseId } from '#types/database'

export interface NotificationData {
  user_id: DatabaseId
  title: string
  message: string
  type: NotificationTypeValue
  related_entity_type?: BackendNotificationEntityType
  related_entity_id?: DatabaseId
}

export interface NotificationCreator {
  handle(data: NotificationData): Promise<NotificationRecord | null>
}

/**
 * CreateNotification — stateless notification creator.
 * No dependency on HttpContext.
 *
 * Uses the notifications module repository provider.
 */
export default class CreateNotification implements NotificationCreator {
  async handle(data: NotificationData): Promise<NotificationRecord | null> {
    const repo = notificationRepositoryProvider.getNotificationRepository()

    return repo.create({
      user_id: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type,
      related_entity_type: data.related_entity_type ?? null,
      related_entity_id: data.related_entity_id ?? null,
    })
  }
}
