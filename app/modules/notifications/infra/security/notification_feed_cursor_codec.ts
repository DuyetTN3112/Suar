import { createHmac, timingSafeEqual } from 'node:crypto'

export interface NotificationFeedCursorValue {
  direction: 'after' | 'before'
  createdAt: string
  notificationId: string
  recipientId: string
  unreadOnly: boolean
}

export interface NotificationFeedCursorExpectedContext {
  direction: 'after' | 'before'
  recipientId: string
  unreadOnly: boolean
}

interface NotificationFeedCursorPayload {
  version: 2
  direction: 'after' | 'before'
  createdAt: string
  notificationId: string
  issuedAt: string
  expiresAt: string
  keyId: string
  contextBinding: string
}

interface NotificationFeedCursorCodecOptions {
  secret: string
  keyId?: string
  verificationSecrets?: Record<string, string>
  ttlMs?: number
  now?: () => Date
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_CURSOR_BYTES = 1_024
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000
const KEY_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/u
const SHA_256_BASE64URL_PATTERN = /^[A-Za-z0-9_-]{43}$/u
const MAX_CURSOR_TTL_MS = 7 * 24 * 60 * 60 * 1_000

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 20 &&
    value.length <= 40 &&
    Number.isFinite(Date.parse(value))
  )
}

function isPayload(value: unknown): value is NotificationFeedCursorPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const payload = value as Record<string, unknown>
  return (
    payload['version'] === 2 &&
    (payload['direction'] === 'after' || payload['direction'] === 'before') &&
    isIsoDate(payload['createdAt']) &&
    typeof payload['notificationId'] === 'string' &&
    UUID_PATTERN.test(payload['notificationId']) &&
    isIsoDate(payload['issuedAt']) &&
    isIsoDate(payload['expiresAt']) &&
    typeof payload['keyId'] === 'string' &&
    KEY_ID_PATTERN.test(payload['keyId']) &&
    typeof payload['contextBinding'] === 'string' &&
    SHA_256_BASE64URL_PATTERN.test(payload['contextBinding'])
  )
}

export class NotificationFeedCursorCodec {
  private readonly activeKeyId: string
  private readonly verificationSecrets: ReadonlyMap<string, string>
  private readonly ttlMs: number
  private readonly now: () => Date

  constructor(options: NotificationFeedCursorCodecOptions) {
    const activeKeyId = options.keyId ?? 'primary'
    if (!KEY_ID_PATTERN.test(activeKeyId)) {
      throw new RangeError('Notification cursor key ID must contain 1-64 safe characters')
    }
    const verificationSecrets = new Map(Object.entries(options.verificationSecrets ?? {}))
    verificationSecrets.set(activeKeyId, options.secret)
    for (const [keyId, secret] of verificationSecrets) {
      if (!KEY_ID_PATTERN.test(keyId)) {
        throw new RangeError('Notification cursor verification key ID is invalid')
      }
      if (Buffer.byteLength(secret, 'utf8') < 32) {
        throw new RangeError(
          `Notification cursor secret "${keyId}" must contain at least 32 UTF-8 bytes`
        )
      }
    }
    this.activeKeyId = activeKeyId
    this.verificationSecrets = verificationSecrets
    this.ttlMs = options.ttlMs ?? 24 * 60 * 60 * 1_000
    this.now = options.now ?? (() => new Date())
    if (!Number.isSafeInteger(this.ttlMs) || this.ttlMs < 1 || this.ttlMs > MAX_CURSOR_TTL_MS) {
      throw new RangeError('Notification cursor TTL must be between 1 ms and 7 days')
    }
  }

  encode(value: NotificationFeedCursorValue): string {
    if (
      !isIsoDate(value.createdAt) ||
      !UUID_PATTERN.test(value.notificationId) ||
      !UUID_PATTERN.test(value.recipientId)
    ) {
      throw new TypeError('Invalid notification cursor sort value')
    }
    const issuedAt = this.now()
    const activeSecret = this.verificationSecrets.get(this.activeKeyId)
    if (!activeSecret) {
      throw new TypeError('Notification cursor active signing key is unavailable')
    }
    const payload: NotificationFeedCursorPayload = {
      version: 2,
      direction: value.direction,
      createdAt: new Date(value.createdAt).toISOString(),
      notificationId: value.notificationId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + this.ttlMs).toISOString(),
      keyId: this.activeKeyId,
      contextBinding: this.bindContext(value.recipientId, value.unreadOnly, activeSecret),
    }
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
    return `${encodedPayload}.${this.sign(encodedPayload, activeSecret)}`
  }

  decode(
    cursor: string | null | undefined,
    expected: NotificationFeedCursorExpectedContext
  ): NotificationFeedCursorValue | null {
    if (
      typeof cursor !== 'string' ||
      cursor.length === 0 ||
      Buffer.byteLength(cursor, 'utf8') > MAX_CURSOR_BYTES
    ) {
      return null
    }
    const parts = cursor.split('.')
    if (parts.length !== 2) {
      return null
    }
    const encodedPayload = parts[0]
    const suppliedSignature = parts[1]
    if (!encodedPayload || !suppliedSignature) {
      return null
    }

    try {
      const parsed: unknown = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
      if (!isPayload(parsed)) {
        return null
      }
      if (parsed.direction !== expected.direction || !UUID_PATTERN.test(expected.recipientId)) {
        return null
      }
      const secret = this.verificationSecrets.get(parsed.keyId)
      if (!secret) {
        return null
      }
      const expectedSignature = this.sign(encodedPayload, secret)
      const suppliedBuffer = Buffer.from(suppliedSignature, 'utf8')
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
      if (
        suppliedBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(suppliedBuffer, expectedBuffer)
      ) {
        return null
      }
      const expectedContextBinding = this.bindContext(
        expected.recipientId,
        expected.unreadOnly,
        secret
      )
      const suppliedContextBuffer = Buffer.from(parsed.contextBinding, 'utf8')
      const expectedContextBuffer = Buffer.from(expectedContextBinding, 'utf8')
      if (
        suppliedContextBuffer.length !== expectedContextBuffer.length ||
        !timingSafeEqual(suppliedContextBuffer, expectedContextBuffer)
      ) {
        return null
      }
      const now = this.now().getTime()
      const issuedAt = Date.parse(parsed.issuedAt)
      const expiresAt = Date.parse(parsed.expiresAt)
      if (
        issuedAt > now + MAX_CLOCK_SKEW_MS ||
        expiresAt <= now ||
        expiresAt <= issuedAt ||
        expiresAt - issuedAt > MAX_CURSOR_TTL_MS
      ) {
        return null
      }
      return {
        direction: parsed.direction,
        createdAt: new Date(parsed.createdAt).toISOString(),
        notificationId: parsed.notificationId,
        recipientId: expected.recipientId,
        unreadOnly: expected.unreadOnly,
      }
    } catch {
      return null
    }
  }

  private sign(encodedPayload: string, secret: string): string {
    return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
  }

  private bindContext(recipientId: string, unreadOnly: boolean, secret: string): string {
    return createHmac('sha256', secret)
      .update(`notification-feed-context-v1\u0000${recipientId}\u0000${unreadOnly ? '1' : '0'}`)
      .digest('base64url')
  }
}
