import type { NotificationRealtimeClient } from '@/apps/shared/notifications/notification_realtime_client'

export interface NotificationAction {
  routeName: string
  params: Record<string, string>
}

export interface NotificationCenterItem {
  id: string
  eventId: string | null
  userId: string
  title: string
  message: string
  isRead: boolean
  type: string
  relatedEntityType: string | null
  relatedEntityId: string | null
  metadata: Record<string, unknown> | null
  schemaVersion: 1
  category: string
  priority: string
  action: NotificationAction | null
  revision: number
  occurredAt: string
  createdAt: string
  updatedAt: string
  readAt: string | null
}

export interface NotificationCenterPagination {
  mode: 'cursor'
  page: number
  perPage: number
  total: number
  lastPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextCursor: string | null
  previousCursor: string | null
}

export interface LatestNotificationPayload {
  data: NotificationCenterItem[]
  recipientId: string
  unreadCount: number
  recipientStateRevision: number
  pagination: NotificationCenterPagination
}

export interface NotificationCenterTransport {
  getLatest(limit: number): Promise<unknown>
  markAsRead(id: string): Promise<void>
  markAllAsRead(): Promise<void>
  delete(id: string): Promise<void>
}

export interface NotificationCenterStoreOptions {
  transport?: NotificationCenterTransport
  loadErrorMessage: () => string
  mutationErrorMessage: () => string
  autoFetch?: boolean
  autoRealtime?: boolean
  initialLimit?: number
  realtime?: NotificationRealtimeClient
  foregroundPollingMs?: number | false
}
