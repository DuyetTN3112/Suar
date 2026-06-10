import type {
  NotificationCategory,
  NotificationPriority, NotificationActionDescriptor 
} from '#modules/notifications/domain/notification-feed/notification_catalog'
import type { NotificationCommandV1 } from '#modules/notifications/domain/notification-feed/notification_command'
import type { RenderedNotificationSnapshot } from '#modules/notifications/domain/notification-feed/notification_renderer'

export type NotificationTransaction = object

export interface CanonicalNotificationRecord {
  id: string
  event_id: string
  event_fingerprint: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata: Record<string, unknown> | null
  schema_version: number
  scope_type: string
  scope_id: string | null
  organization_id: string | null
  category: string
  priority: string
  template_key: string
  template_version: number
  locale: string
  parameters: Record<string, unknown>
  action: NotificationActionDescriptor | null
  revision: number
  dedupe_key: string | null
  retention_class: string
  retention_until: Date
  occurred_at: Date
  created_at: Date
  updated_at: Date | null
  read_at: Date | null
}

export interface NotificationAcceptancePersistenceResult {
  terminalState: 'active' | 'deleted' | 'purged'
  notificationId: string
  notification: CanonicalNotificationRecord | null
  duplicate: boolean
}

export interface NotificationAcceptanceWrite {
  command: NotificationCommandV1
  fingerprint: string
  snapshot: RenderedNotificationSnapshot
  category: Exclude<NotificationCategory, 'legacy'>
  priority: NotificationPriority
  templateKey: string
  templateVersion: number
  retentionClass: string
  retentionUntil: Date
  acceptedAt: Date
}

export interface NotificationAcceptanceRepository {
  stage(
    input: NotificationAcceptanceWrite,
    transaction: NotificationTransaction
  ): Promise<NotificationAcceptancePersistenceResult>
}

export interface NotificationTransactionRunner {
  run<T>(work: (transaction: NotificationTransaction) => Promise<T>): Promise<T>
}
