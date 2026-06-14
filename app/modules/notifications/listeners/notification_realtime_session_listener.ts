import type {
  UserDeactivatedEvent,
  UserLogoutEvent,
} from '#modules/users/public_contracts/user_events'

export interface NotificationRealtimeSessionListenerDependencies {
  revoke(recipientId: string, options?: { sessionId?: string }): Promise<void>
}

export function handleNotificationRealtimeUserLogout(
  event: UserLogoutEvent,
  dependencies: NotificationRealtimeSessionListenerDependencies
): Promise<void> {
  return dependencies.revoke(event.userId, event.sessionId ? { sessionId: event.sessionId } : {})
}

export function handleNotificationRealtimeUserDeactivated(
  event: UserDeactivatedEvent,
  dependencies: NotificationRealtimeSessionListenerDependencies
): Promise<void> {
  return dependencies.revoke(event.userId)
}
