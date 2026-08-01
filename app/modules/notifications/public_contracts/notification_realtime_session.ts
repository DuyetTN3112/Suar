import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

interface NotificationRealtimeSessionProvider {
  revoke(recipientId: string, options?: { sessionId?: string }): Promise<void>
}

let provider: NotificationRealtimeSessionProvider | null = null

export function registerNotificationRealtimeSessionProvider(
  implementation: NotificationRealtimeSessionProvider
): void {
  provider = implementation
}

export function revokeNotificationRealtimeSessions(recipientId: string): Promise<void> {
  if (!provider) {
    throw new InvariantViolationException(
      'Notification realtime session provider has not been registered'
    )
  }
  return provider.revoke(recipientId)
}

export function revokeNotificationRealtimeSession(
  recipientId: string,
  sessionId: string
): Promise<void> {
  if (!provider) {
    throw new InvariantViolationException(
      'Notification realtime session provider has not been registered'
    )
  }
  return provider.revoke(recipientId, { sessionId })
}
