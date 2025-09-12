export interface NotificationResponse {
  id: string
  userId: string
  title: string
  message: string
  isRead: boolean
  type: string
  relatedEntityType: string | null
  relatedEntityId: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  readAt: string | null
}
