export type NotificationRealtimeInvalidation =
  | {
      type: 'notification.feed.changed'
      notificationId: string
      notificationRevision: number
    }
  | {
      type: 'notification.count.changed'
      recipientStateRevision: number
    }

export type NotificationRealtimeRevocation =
  | {
      scope: 'user'
      recipientId: string
    }
  | {
      scope: 'session'
      recipientId: string
      sessionId: string
    }

export const NOTIFICATION_REALTIME_INVALIDATION_CHANNEL =
  'suar:notifications:realtime-invalidation'
export const NOTIFICATION_SESSION_REVOCATION_CHANNEL =
  'suar:notifications:session-revoked'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

interface NotificationRealtimeGateway {
  close(revocation: NotificationRealtimeRevocation): void
}

let gateway: NotificationRealtimeGateway | null = null

export function registerNotificationRealtimeGateway(
  implementation: NotificationRealtimeGateway
): void {
  gateway = implementation
}

export function closeNotificationRealtimeGateway(
  revocation: NotificationRealtimeRevocation
): void {
  gateway?.close(revocation)
}

export function isValidNotificationRealtimeUid(uid: string): boolean {
  return UUID_PATTERN.test(uid)
}

export function notificationRecipientChannel(recipientId: string): string {
  return `notifications/users/${recipientId}`
}

export function canSubscribeToNotificationRecipientChannel(
  authenticatedRecipientId: string | null | undefined,
  requestedRecipientId: string
): boolean {
  return (
    typeof authenticatedRecipientId === 'string' &&
    authenticatedRecipientId.length > 0 &&
    authenticatedRecipientId === requestedRecipientId
  )
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function positiveRevision(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 1 ? Number(value) : null
}

function parseInvalidation(value: unknown): NotificationRealtimeInvalidation | null {
  const input = record(value)
  if (!input) {
    return null
  }
  if (
    input['type'] === 'notification.feed.changed' &&
    Object.keys(input).length === 3
  ) {
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
  if (
    input['type'] === 'notification.count.changed' &&
    Object.keys(input).length === 2
  ) {
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

export function serializeNotificationRealtimeInvalidation(
  recipientId: string,
  payload: NotificationRealtimeInvalidation
): string {
  const message = JSON.stringify({ version: 1, recipientId, payload })
  if (parseNotificationRealtimeInvalidationMessage(message) === null) {
    throw new RangeError('Notification realtime invalidation envelope is invalid')
  }
  return message
}

export function parseNotificationRealtimeInvalidationMessage(
  message: string
): { recipientId: string; payload: NotificationRealtimeInvalidation } | null {
  if (message.length === 0 || message.length > 2_048) {
    return null
  }
  let decoded: unknown
  try {
    decoded = JSON.parse(message)
  } catch {
    return null
  }
  const envelope = record(decoded)
  if (!envelope || envelope['version'] !== 1 || Object.keys(envelope).length !== 3) {
    return null
  }
  const recipientId = envelope['recipientId']
  const payload = parseInvalidation(envelope['payload'])
  if (
    typeof recipientId !== 'string' ||
    recipientId.length === 0 ||
    recipientId.length > 128 ||
    payload === null
  ) {
    return null
  }
  return { recipientId, payload }
}

export function serializeNotificationRealtimeRevocation(
  revocation: NotificationRealtimeRevocation
): string {
  const message = JSON.stringify({ version: 1, ...revocation })
  if (parseNotificationRealtimeRevocationMessage(message) === null) {
    throw new RangeError('Notification realtime revocation envelope is invalid')
  }
  return message
}

export function parseNotificationRealtimeRevocationMessage(
  message: string
): NotificationRealtimeRevocation | null {
  if (message.length === 0 || message.length > 1_024) {
    return null
  }
  let decoded: unknown
  try {
    decoded = JSON.parse(message)
  } catch {
    return null
  }
  const envelope = record(decoded)
  if (!envelope || envelope['version'] !== 1) {
    return null
  }
  const recipientId = envelope['recipientId']
  if (
    typeof recipientId !== 'string' ||
    recipientId.length === 0 ||
    recipientId.length > 128
  ) {
    return null
  }
  if (envelope['scope'] === 'user' && Object.keys(envelope).length === 3) {
    return { scope: 'user', recipientId }
  }
  const sessionId = envelope['sessionId']
  if (
    envelope['scope'] === 'session' &&
    Object.keys(envelope).length === 4 &&
    typeof sessionId === 'string' &&
    sessionId.length > 0 &&
    sessionId.length <= 256
  ) {
    return { scope: 'session', recipientId, sessionId }
  }
  return null
}
