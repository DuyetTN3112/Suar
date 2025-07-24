import type { DatabaseId } from '#types/database'

export interface NotificationCreateData {
  user_id: DatabaseId
  title: string
  message: string
  type: string
  related_entity_type?: string | null
  related_entity_id?: DatabaseId | null
  metadata?: Record<string, unknown> | null
}

export interface NotificationRecord {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: Date
  updated_at: Date | null
  read_at: Date | null
}

export interface NotificationRepository {
  create(data: NotificationCreateData): Promise<NotificationRecord | null>
  findByUser(
    userId: DatabaseId,
    options?: { isRead?: boolean; limit?: number; page?: number }
  ): Promise<{ data: NotificationRecord[]; total: number }>
  markAsRead(notificationId: DatabaseId, userId?: DatabaseId): Promise<boolean>
  markAllAsRead(userId: DatabaseId): Promise<void>
  delete(notificationId: DatabaseId, userId?: DatabaseId): Promise<boolean>
  deleteAllRead(userId: DatabaseId): Promise<void>
  getUnreadCount(userId: DatabaseId): Promise<number>
}
