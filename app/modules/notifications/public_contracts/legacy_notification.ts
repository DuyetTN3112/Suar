import type {
  BackendNotificationEntityType,
  NotificationTypeValue,
} from '#modules/notifications/public_contracts/notification_constants'

export interface LegacyNotificationInput {
  user_id: string
  title: string
  message: string
  type: NotificationTypeValue
  related_entity_type?: BackendNotificationEntityType
  related_entity_id?: string
  event_id?: string
  occurred_at?: string
  correlation_id?: string
  dedupe_key?: string
}
