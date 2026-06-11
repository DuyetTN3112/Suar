import logger from '@adonisjs/core/services/logger'
import Redis from '@adonisjs/redis/services/main'

import {
  closeNotificationRealtimeGateway,
  NOTIFICATION_SESSION_REVOCATION_CHANNEL,
  serializeNotificationRealtimeRevocation,
  type NotificationRealtimeRevocation,
} from '#modules/notifications/public_contracts/notification_realtime'

interface NotificationRealtimeConnectionCloser {
  close(revocation: NotificationRealtimeRevocation): void
}

interface NotificationSessionRevocationPublisher {
  publish(channel: string, payload: string): Promise<unknown>
}

interface NotificationSessionRevocationReporter {
  failed(error: unknown): void
}

const defaultCloser: NotificationRealtimeConnectionCloser = {
  close: closeNotificationRealtimeGateway,
}

const defaultPublisher: NotificationSessionRevocationPublisher = {
  publish(channel, payload) {
    return Redis.publish(channel, payload)
  },
}

const defaultReporter: NotificationSessionRevocationReporter = {
  failed(error) {
    logger.warn(
      {
        event_name: 'notification.realtime.session_revocation_publish_failed',
        subsystem: 'notification_realtime',
        error_class: error instanceof Error ? error.constructor.name : 'UnknownError',
      },
      'Notification realtime session revocation could not reach every instance'
    )
  },
}

export class NotificationRealtimeSessionRevoker {
  constructor(
    private readonly closer: NotificationRealtimeConnectionCloser = defaultCloser,
    private readonly publisher: NotificationSessionRevocationPublisher = defaultPublisher,
    private readonly reporter: NotificationSessionRevocationReporter = defaultReporter
  ) {}

  async revoke(recipientId: string, options: { sessionId?: string } = {}): Promise<void> {
    const revocation: NotificationRealtimeRevocation = options.sessionId
      ? { scope: 'session', recipientId, sessionId: options.sessionId }
      : { scope: 'user', recipientId }
    this.closer.close(revocation)
    try {
      await this.publisher.publish(
        NOTIFICATION_SESSION_REVOCATION_CHANNEL,
        serializeNotificationRealtimeRevocation(revocation)
      )
    } catch (error) {
      this.reporter.failed(error)
    }
  }
}

export const notificationRealtimeSessionRevoker = new NotificationRealtimeSessionRevoker()
