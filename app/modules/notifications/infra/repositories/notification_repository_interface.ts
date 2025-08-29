
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
    userId: string,
    options?: { isRead?: boolean; limit?: number; page?: number }
  ): Promise<{ data: NotificationRecord[]; total: number }>
  markAsRead(notificationId: string, userId?: string): Promise<boolean>
  markAllAsRead(userId: string): Promise<void>
  delete(notificationId: string, userId?: string): Promise<boolean>
  deleteAllRead(userId: string): Promise<void>
  getUnreadCount(userId: string): Promise<number>
}
