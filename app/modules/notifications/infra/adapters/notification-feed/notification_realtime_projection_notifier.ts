import logger from '@adonisjs/core/services/logger'

import { cacheRedisCommandStore } from '#modules/cache/public_contracts/cache_store'
import type {
  NotificationOutboxHandler,
  NotificationOutboxJob,
} from '#modules/notifications/domain/notification-outbox/notification_outbox'
import {
  NOTIFICATION_REALTIME_INVALIDATION_CHANNEL,
  notificationRecipientChannel,
  serializeNotificationRealtimeInvalidation,
  type NotificationRealtimeInvalidation,
} from '#modules/notifications/public_contracts/notification_realtime'

interface NotificationRealtimeBroadcaster {
  broadcast(channel: string, payload: NotificationRealtimeInvalidation): void | Promise<unknown>
}

interface NotificationRealtimeFailureReporter {
  failed(job: NotificationOutboxJob, error: unknown): void
}

const defaultBroadcaster: NotificationRealtimeBroadcaster = {
  broadcast(channel, payload) {
    const prefix = 'notifications/users/'
    if (!channel.startsWith(prefix)) {
      throw new RangeError('Notification realtime channel is invalid')
    }
    return cacheRedisCommandStore.publish(
      NOTIFICATION_REALTIME_INVALIDATION_CHANNEL,
      serializeNotificationRealtimeInvalidation(channel.slice(prefix.length), payload)
    )
  },
}

const defaultReporter: NotificationRealtimeFailureReporter = {
  failed(job, error) {
    logger.warn(
      {
        event_name: 'notification.realtime.broadcast_failed',
        subsystem: 'notification_realtime',
        outbox_id: job.id,
        destination: job.destination,
        error_class: error instanceof Error ? error.constructor.name : 'UnknownError',
      },
      'Notification realtime invalidation failed; client recovery remains polling-based'
    )
  },
}

function invalidationFor(job: NotificationOutboxJob): NotificationRealtimeInvalidation | null {
  if (job.destination === 'feed_search') {
    return job.notificationId
      ? {
          type: 'notification.feed.changed',
          notificationId: job.notificationId,
          notificationRevision: job.projectionRevision,
        }
      : null
  }
  return {
    type: 'notification.count.changed',
    recipientStateRevision: job.recipientStateRevision,
  }
}

export class NotificationRealtimeProjectionNotifier {
  constructor(
    private readonly broadcaster: NotificationRealtimeBroadcaster = defaultBroadcaster,
    private readonly reporter: NotificationRealtimeFailureReporter = defaultReporter
  ) {}

  decorate(handler: NotificationOutboxHandler): NotificationOutboxHandler {
    return async (job, context) => {
      await handler(job, context)
      const invalidation = invalidationFor(job)
      if (!invalidation) return
      try {
        const publication = this.broadcaster.broadcast(
          notificationRecipientChannel(job.recipientId),
          invalidation
        )
        if (publication) {
          void publication.catch((error: unknown) => this.reporter.failed(job, error))
        }
      } catch (error) {
        this.reporter.failed(job, error)
      }
    }
  }
}
