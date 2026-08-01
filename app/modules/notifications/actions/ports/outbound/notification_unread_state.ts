import type { NotificationUnreadProjectionValue } from '#modules/notifications/domain/notification_unread_state'

export interface NotificationUnreadCacheReader {
  get(recipientId: string): Promise<string | null>
}

export interface NotificationUnreadStateReader {
  read(recipientId: string): Promise<{ count: number; revision: number }>
}

export interface NotificationUnreadStateWriter {
  apply(value: NotificationUnreadProjectionValue): Promise<boolean>
}
