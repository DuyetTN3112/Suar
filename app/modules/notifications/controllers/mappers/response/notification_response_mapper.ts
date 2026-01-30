import type { NotificationActionDescriptor } from '#modules/notifications/domain/notification_catalog'

/**
 * Map notification data to the HTTP response projection.
 *
 * Handles the date formatting (DateTime objects → ISO strings)
 * that used to live in NotificationsController.latest().
 */
export interface NotificationResponseSource {
  id: string
  event_id?: string | null
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata?: Record<string, unknown> | null
  schema_version?: number
  category?: string
  priority?: string
  action?: NotificationActionDescriptor | null
  revision?: number
  occurred_at?: string | Date | { toISO: () => string } | null
  created_at: string | Date | { toISO: () => string }
  updated_at?: string | Date | { toISO: () => string } | null
  read_at?: string | Date | { toISO: () => string } | null
}

export interface NotificationResponse {
  id: string
  event_id: string | null
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata?: Record<string, unknown> | null
  schema_version: number
  category: string
  priority: string
  action: NotificationActionDescriptor | null
  revision: number
  occurred_at: string
  created_at: string
  updated_at: string
  read_at: string | null
}

export function mapNotificationResponse(
  notification: NotificationResponseSource
): NotificationResponse {
  const toIsoString = (
    value: string | Date | { toISO: () => string } | null | undefined,
    fallback: string | null
  ): string | null => {
    if (!value) return fallback
    if (typeof value === 'string') return value
    if (value instanceof Date) return value.toISOString()
    return value.toISO()
  }

  const createdAt =
    toIsoString(notification.created_at, new Date().toISOString()) ?? new Date().toISOString()

  return {
    id: notification.id,
    event_id: notification.event_id ?? null,
    user_id: notification.user_id,
    title: notification.title,
    message: notification.message,
    is_read: notification.is_read,
    type: notification.type,
    related_entity_type: notification.related_entity_type,
    related_entity_id: notification.related_entity_id,
    // Public metadata stays closed by default until a catalog type declares
    // an explicit allowlist. Legacy arbitrary metadata must not cross the API.
    metadata: null,
    schema_version: notification.schema_version ?? 1,
    category: notification.category ?? 'legacy',
    priority: notification.priority ?? 'normal',
    action: notification.action ?? null,
    revision: notification.revision ?? 1,
    occurred_at: toIsoString(notification.occurred_at, createdAt) ?? createdAt,
    created_at: createdAt,
    updated_at: toIsoString(notification.updated_at, createdAt) ?? createdAt,
    read_at: toIsoString(notification.read_at, null),
  }
}

export function mapNotificationResponses(
  notifications: NotificationResponseSource[]
): NotificationResponse[] {
  return notifications.map(mapNotificationResponse)
}
