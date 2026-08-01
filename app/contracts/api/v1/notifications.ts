export interface NotificationActionResponse {
  routeName: string
  params: Record<string, string>
}

export interface NotificationResponse {
  id: string
  eventId: string | null
  userId: string
  title: string
  message: string
  isRead: boolean
  type: string
  relatedEntityType: string | null
  relatedEntityId: string | null
  metadata?: Record<string, unknown> | null
  schemaVersion: number
  category: string
  priority: string
  action: NotificationActionResponse | null
  revision: number
  occurredAt: string
  createdAt: string
  updatedAt: string
  readAt: string | null
}
