import type { NotificationRecord } from '#modules/notifications/infra/repositories/notification_repository_interface'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'
import type {
  BackendNotificationEntityType,
  NotificationTypeValue,
} from '#modules/notifications/public_contracts/notification_constants'

export interface NotificationData {
  user_id: string
  title: string
  message: string
  type: NotificationTypeValue
  related_entity_type?: BackendNotificationEntityType
  related_entity_id?: string
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
