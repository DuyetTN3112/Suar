import type { CanonicalNotificationRecord } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'

export interface NotificationAcceptanceResult {
  status: 'staged' | 'accepted'
  terminalState: 'active' | 'deleted' | 'purged'
  notificationId: string
  notification: CanonicalNotificationRecord | null
  duplicate: boolean
}
