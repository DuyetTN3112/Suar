import { RepositoryFactory } from '#infra/shared/repositories/index'
import type { NotificationRecord } from '#infra/shared/repositories/interfaces'
import type { DatabaseId } from '#types/database'
import type {
  BackendNotificationEntityType,
  NotificationTypeValue,
} from '#constants/notification_constants'

type NotificationData = {
  user_id: DatabaseId
  title: string
  message: string
  type: NotificationTypeValue
  related_entity_type?: BackendNotificationEntityType
  related_entity_id?: DatabaseId
}

/**
 * CreateNotification — stateless notification creator.
 * No dependency on HttpContext.
 *
 * Uses Repository Pattern (Sprint 5):
 *   - RepositoryFactory resolves implementation based on env var NOTIFICATION_STORAGE
 *   - Supports mysql | mongodb | both (DualWrite)
 */
export default class CreateNotification {
  async handle(data: NotificationData): Promise<NotificationRecord | null> {
    const repo = await RepositoryFactory.getNotificationRepository()

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
