import type { NotificationActionDescriptor } from '#modules/notifications/domain/notification_catalog'

export interface NotificationCreateData {
  user_id: string
  title: string
  message: string
  type: string
  related_entity_type?: string | null
  related_entity_id?: string | null
  metadata?: Record<string, unknown> | null
}

export interface NotificationRecord {
  id: string
  event_id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata: Record<string, unknown> | null
  schema_version: number
  category: string
  priority: string
  action: NotificationActionDescriptor | null
  revision: number
  occurred_at: Date
  created_at: Date
  updated_at: Date | null
  read_at: Date | null
}

export interface NotificationRepository {
  create(data: NotificationCreateData): Promise<NotificationRecord | null>
  findByUser(
    userId: string,
    options?: { isRead?: boolean; limit?: number; page?: number }
  ): Promise<{ data: NotificationRecord[]; total: number }>
  findByUserCursor(
    userId: string,
    options?: { isRead?: boolean; limit?: number; after?: string | null; before?: string | null }
  ): Promise<{
    data: NotificationRecord[]
    nextCursor: string | null
    previousCursor: string | null
    hasNextPage: boolean
    hasPreviousPage: boolean
  }>
  markAsRead(notificationId: string, userId?: string): Promise<boolean>
  markAllAsRead(userId: string): Promise<void>
  delete(notificationId: string, userId?: string): Promise<boolean>
  deleteAllRead(userId: string): Promise<void>
  getUnreadCount(userId: string): Promise<number>
}
