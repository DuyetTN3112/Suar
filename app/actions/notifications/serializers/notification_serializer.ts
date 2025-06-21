/**
 * Serialize notification data for API JSON responses.
 *
 * Handles the date formatting (DateTime objects → ISO strings)
 * that used to live in NotificationsController.latest().
 */
export interface RawNotificationData {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata?: Record<string, unknown> | null
  created_at: string | Date | { toISO: () => string }
  updated_at?: string | Date | { toISO: () => string } | null
  read_at?: string | Date | { toISO: () => string } | null
}

export interface SerializedNotification {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  read_at: string | null
}

export function serializeNotification(notification: RawNotificationData): SerializedNotification {
  const toIsoString = (
    value: string | Date | { toISO: () => string } | null | undefined,
    fallback: string | null
  ): string | null => {
    if (!value) return fallback
    if (typeof value === 'string') return value
    if (value instanceof Date) return value.toISOString()
    return value.toISO()
  }

  return {
    id: notification.id,
    user_id: notification.user_id,
    title: notification.title,
    message: notification.message,
    is_read: notification.is_read,
    type: notification.type,
    related_entity_type: notification.related_entity_type,
    related_entity_id: notification.related_entity_id,
    metadata: notification.metadata,
    created_at:
      toIsoString(notification.created_at, new Date().toISOString()) ?? new Date().toISOString(),
    updated_at:
      toIsoString(notification.updated_at, new Date().toISOString()) ?? new Date().toISOString(),
    read_at: toIsoString(notification.read_at, null),
  }
}

export function serializeNotifications(
  notifications: RawNotificationData[]
): SerializedNotification[] {
  return notifications.map(serializeNotification)
}
