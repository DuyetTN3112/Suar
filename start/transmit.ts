import type { ServerResponse } from 'node:http'

import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import Redis from '@adonisjs/redis/services/main'
import transmit from '@adonisjs/transmit/services/main'

import { transmitRedisEnabled, transmitRuntimeLimits } from '#config/transmit'
import { cacheRedisSubscriptionStore } from '#modules/cache/public_contracts/cache_store'
import {
  canSubscribeToNotificationRecipientChannel,
  isValidNotificationRealtimeUid,
  NOTIFICATION_REALTIME_INVALIDATION_CHANNEL,
  NOTIFICATION_SESSION_REVOCATION_CHANNEL,
  notificationRecipientChannel,
  parseNotificationRealtimeInvalidationMessage,
  parseNotificationRealtimeRevocationMessage,
  registerNotificationRealtimeGateway,
  type NotificationRealtimeInvalidation,
  type NotificationRealtimeRevocation,
} from '#modules/notifications/public_contracts/notification_realtime'
import { middleware } from '#start/kernel'

function streamsForUid(uid: string) {
  return [...transmit.getManager().getAllSubscribers()]
    .map(([stream]) => stream)
    .filter((stream) => stream.getUid() === uid)
}

type NotificationTransmitStream = ReturnType<typeof streamsForUid>[number]

interface NotificationRealtimeConnection {
  uid: string
  userId: string
  sessionId: string
  connectedAt: number
  stream: NotificationTransmitStream
  response: ServerResponse
}

const connectionsByUid = new Map<string, NotificationRealtimeConnection>()
const uidsByUser = new Map<string, Set<string>>()
const CACHE_SUBSCRIPTION_RETRY_MAX_DELAY_MS = 30_000

function forceCloseResponse(response: ServerResponse): void {
  const timer = setTimeout(() => {
    if (!response.destroyed && !response.writableEnded) {
      response.destroy()
    }
  }, 1_000)
  timer.unref()
}

function endStreams(uid: string, responses: ServerResponse[] = []): void {
  for (const stream of streamsForUid(uid)) {
    stream.end()
  }
  for (const response of responses) {
    forceCloseResponse(response)
  }
}

function addConnection(connection: NotificationRealtimeConnection): void {
  connectionsByUid.set(connection.uid, connection)
  const uids = uidsByUser.get(connection.userId) ?? new Set<string>()
  uids.add(connection.uid)
  uidsByUser.set(connection.userId, uids)
}

function removeConnection(connection: NotificationRealtimeConnection): void {
  connectionsByUid.delete(connection.uid)
  const uids = uidsByUser.get(connection.userId)
  if (!uids) {
    return
  }
  uids.delete(connection.uid)
  if (uids.size === 0) {
    uidsByUser.delete(connection.userId)
  }
}

function activeConnectionsForUser(userId: string): number {
  return uidsByUser.get(userId)?.size ?? 0
}

function matchesRevocation(
  connection: NotificationRealtimeConnection,
  revocation: NotificationRealtimeRevocation
): boolean {
  return (
    connection.userId === revocation.recipientId &&
    (revocation.scope === 'user' || connection.sessionId === revocation.sessionId)
  )
}

function closeRevokedConnections(revocation: NotificationRealtimeRevocation): void {
  const uids = uidsByUser.get(revocation.recipientId)
  if (!uids) {
    return
  }
  for (const uid of [...uids]) {
    const connection = connectionsByUid.get(uid)
    if (!connection) {
      continue
    }
    if (!matchesRevocation(connection, revocation)) {
      continue
    }
    connection.stream.writeMessage({
      data: {
        channel: notificationRecipientChannel(revocation.recipientId),
        payload: { type: 'session.revoked' },
      },
    })
    connection.stream.end()
    forceCloseResponse(connection.response)
  }
}

function closeBackpressuredConnection(
  connection: NotificationRealtimeConnection,
  bufferedEventsEstimate: number
): void {
  logger.warn(
    {
      event_name: 'notification.realtime.connection_closed',
      subsystem: 'notification_realtime',
      reason: 'backpressure_limit',
      buffered_events_estimate: bufferedEventsEstimate,
    },
    'Notification realtime connection closed for excessive buffering'
  )
  connection.stream.end()
  forceCloseResponse(connection.response)
}

function deliverInvalidation(recipientId: string, payload: NotificationRealtimeInvalidation): void {
  const uids = uidsByUser.get(recipientId)
  if (!uids) {
    return
  }
  for (const uid of [...uids]) {
    const connection = connectionsByUid.get(uid)
    if (!connection) {
      continue
    }
    const beforeWrite = Math.ceil(connection.stream.readableLength / 2)
    if (beforeWrite >= transmitRuntimeLimits.maxBufferedEvents) {
      closeBackpressuredConnection(connection, beforeWrite)
      continue
    }
    connection.stream.writeMessage({
      data: {
        channel: notificationRecipientChannel(recipientId),
        payload,
      },
    })
    const afterWrite = Math.ceil(connection.stream.readableLength / 2)
    if (afterWrite > transmitRuntimeLimits.maxBufferedEvents) {
      closeBackpressuredConnection(connection, afterWrite)
    }
  }
}

function handleCacheRealtimeInvalidation(rawMessage: string): void {
  const message = parseNotificationRealtimeInvalidationMessage(rawMessage)
  if (!message) {
    logger.warn(
      {
        event_name: 'notification.realtime.invalidation_rejected',
        subsystem: 'notification_realtime',
        reason: 'invalid_envelope',
      },
      'Notification realtime invalidation envelope was rejected'
    )
    return
  }
  deliverInvalidation(message.recipientId, message.payload)
}

function subscribeToCacheRealtimeInvalidations(attempt = 1): void {
  void cacheRedisSubscriptionStore
    .subscribe(NOTIFICATION_REALTIME_INVALIDATION_CHANNEL, handleCacheRealtimeInvalidation)
    .catch((error: unknown) => {
      const retryDelayMs = Math.min(
        CACHE_SUBSCRIPTION_RETRY_MAX_DELAY_MS,
        1_000 * 2 ** Math.min(attempt - 1, 5)
      )
      logger.error(
        {
          err: error,
          event_name: 'notification.realtime.cache_subscription_failed',
          subsystem: 'notification_realtime',
          retryDelayMs,
        },
        'Notification realtime cache subscription failed; retry scheduled'
      )
      const retryTimer = setTimeout(
        () => subscribeToCacheRealtimeInvalidations(attempt + 1),
        retryDelayMs
      )
      retryTimer.unref()
    })
}

registerNotificationRealtimeGateway({
  close: closeRevokedConnections,
})

transmit.authorize<{ recipientId: string }>(
  'notifications/users/:recipientId',
  (ctx, { recipientId }) =>
    canSubscribeToNotificationRecipientChannel(ctx.auth.user?.id, recipientId)
)

transmit.registerRoutes((route) => {
  route.use(middleware.auth())
})

transmit.on('connect', ({ uid, context }) => {
  const userId = context.auth.user?.id
  const sessionId = context.session.sessionId
  const response = context.response.response
  const streams = streamsForUid(uid)
  const existingConnection = connectionsByUid.get(uid)
  if (existingConnection) {
    logger.warn(
      {
        event_name: 'notification.realtime.connection_rejected',
        subsystem: 'notification_realtime',
        reason: 'duplicate_uid',
      },
      'Notification realtime connection rejected'
    )
    for (const stream of streams) {
      if (stream !== existingConnection.stream) {
        stream.end()
      }
    }
    forceCloseResponse(response)
    return
  }
  if (
    !userId ||
    !isValidNotificationRealtimeUid(uid) ||
    typeof sessionId !== 'string' ||
    sessionId.length === 0 ||
    sessionId.length > 256 ||
    streams.length !== 1
  ) {
    logger.warn(
      {
        event_name: 'notification.realtime.connection_rejected',
        subsystem: 'notification_realtime',
        reason: 'invalid_identity',
      },
      'Notification realtime connection rejected'
    )
    endStreams(uid, [response])
    return
  }

  if (activeConnectionsForUser(userId) >= transmitRuntimeLimits.maxConnectionsPerUser) {
    logger.warn(
      {
        event_name: 'notification.realtime.connection_rejected',
        subsystem: 'notification_realtime',
        reason: 'per_instance_user_connection_limit',
      },
      'Notification realtime connection rejected'
    )
    endStreams(uid, [response])
    return
  }

  const stream = streams[0]
  if (!stream) {
    endStreams(uid, [response])
    return
  }
  addConnection({
    uid,
    userId,
    sessionId,
    connectedAt: Date.now(),
    stream,
    response,
  })
})

transmit.on('disconnect', ({ uid, context }) => {
  const connection = connectionsByUid.get(uid)
  if (connection?.response === context.response.response) {
    removeConnection(connection)
  }
})

const connectionMonitor = setInterval(() => {
  const now = Date.now()
  for (const connection of connectionsByUid.values()) {
    const bufferedEventsEstimate = Math.ceil(connection.stream.readableLength / 2)
    if (bufferedEventsEstimate > transmitRuntimeLimits.maxBufferedEvents) {
      closeBackpressuredConnection(connection, bufferedEventsEstimate)
      continue
    }
    if (now - connection.connectedAt >= transmitRuntimeLimits.maxConnectionAgeMs) {
      connection.stream.end()
      forceCloseResponse(connection.response)
    }
  }
}, 5_000)
connectionMonitor.unref()

if (app.getEnvironment() === 'web' && transmitRedisEnabled) {
  subscribeToCacheRealtimeInvalidations()
  Redis.subscribe(NOTIFICATION_SESSION_REVOCATION_CHANNEL, (rawMessage) => {
    const revocation = parseNotificationRealtimeRevocationMessage(rawMessage)
    if (!revocation) {
      logger.warn(
        {
          event_name: 'notification.realtime.revocation_rejected',
          subsystem: 'notification_realtime',
          reason: 'invalid_envelope',
        },
        'Notification realtime revocation envelope was rejected'
      )
      return
    }
    closeRevokedConnections(revocation)
  })
}
