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
  metadata?: Record<string, unknown>
  created_at: string | { toISO: () => string }
  updated_at?: string | { toISO: () => string }
  read_at?: string | { toISO: () => string } | null
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
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  read_at: string | null
}

export function serializeNotification(notification: RawNotificationData): SerializedNotification {
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
    created_at: notification.created_at
      ? typeof notification.created_at === 'string'
        ? notification.created_at
        : notification.created_at.toISO()
      : new Date().toISOString(),
    updated_at: notification.updated_at
      ? typeof notification.updated_at === 'string'
        ? notification.updated_at
        : notification.updated_at.toISO()
      : new Date().toISOString(),
    read_at: notification.read_at
      ? typeof notification.read_at === 'string'
        ? notification.read_at
        : notification.read_at.toISO()
      : null,
  }
}

export function serializeNotifications(
  notifications: RawNotificationData[]
): SerializedNotification[] {
  return notifications.map(serializeNotification)
}
