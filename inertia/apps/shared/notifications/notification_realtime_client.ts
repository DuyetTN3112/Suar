import { Transmit } from '@adonisjs/transmit-client'

export type NotificationRealtimeSignal =
  | {
      type: 'notification.feed.changed'
      notificationId: string
      notificationRevision: number
    }
  | {
      type: 'notification.count.changed'
      recipientStateRevision: number
    }

export interface NotificationRealtimeHandlers {
  signal(value: NotificationRealtimeSignal): void
  reconnected(): void
  sessionRevoked(): void
}

export interface NotificationRealtimeClient {
  subscribe(
    recipientId: string,
    handlers: NotificationRealtimeHandlers
  ): Promise<() => Promise<void>>
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function positiveRevision(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 1 ? Number(value) : null
}

export function parseNotificationRealtimeSignal(
  value: unknown
): NotificationRealtimeSignal | 'session.revoked' | null {
  const input = record(value)
  if (!input) {
    return null
  }
  if (input['type'] === 'session.revoked') {
    return 'session.revoked'
  }
  if (input['type'] === 'notification.feed.changed') {
    const notificationId = input['notificationId']
    const notificationRevision = positiveRevision(input['notificationRevision'])
    return typeof notificationId === 'string' &&
      notificationId.length > 0 &&
      notificationId.length <= 128 &&
      notificationRevision !== null
      ? {
          type: 'notification.feed.changed',
          notificationId,
          notificationRevision,
        }
      : null
  }
  if (input['type'] === 'notification.count.changed') {
    const recipientStateRevision = positiveRevision(input['recipientStateRevision'])
    return recipientStateRevision === null
      ? null
      : {
          type: 'notification.count.changed',
          recipientStateRevision,
        }
  }
  return null
}

export const transmitNotificationRealtimeClient: NotificationRealtimeClient = {
  async subscribe(recipientId, handlers) {
    const client = new Transmit({
      baseUrl: window.location.origin,
      maxReconnectAttempts: 10,
    })
    let connected = false
    const onConnected = () => {
      if (connected) {
        handlers.reconnected()
      }
      connected = true
    }
    client.on('connected', onConnected)

    const subscription = client.subscription(`notifications/users/${recipientId}`)
    const removeMessageHandler = subscription.onMessage<unknown>((message) => {
      const signal = parseNotificationRealtimeSignal(message)
      if (signal === 'session.revoked') {
        handlers.sessionRevoked()
        client.close()
        return
      }
      if (signal) {
        handlers.signal(signal)
      }
    })

    try {
      await subscription.create()
    } catch (error) {
      removeMessageHandler()
      client.off('connected', onConnected)
      client.close()
      throw error
    }

    return async () => {
      removeMessageHandler()
      client.off('connected', onConnected)
      try {
        await subscription.delete()
      } finally {
        client.close()
      }
    }
  },
}
