import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export const NOTIFICATION_LIMITS = {
  parameterBytes: 16 * 1024,
  jsonDepth: 5,
  jsonObjectKeys: 64,
  jsonArrayLength: 50,
  jsonStringBytes: 2 * 1024,
  correlationIdCharacters: 128,
  dedupeKeyCharacters: 255,
  identityCharacters: 128,
  onlineIdempotencyDays: 180,
  futureClockSkewMinutes: 5,
} as const

type JsonPrimitive = string | number | boolean | null
export type NotificationJsonValue =
  | JsonPrimitive
  | NotificationJsonValue[]
  | { [key: string]: NotificationJsonValue }

const utf8Encoder = new TextEncoder()

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Reflect.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function validateJsonValue(value: unknown, depth: number, path: string): NotificationJsonValue {
  if (depth > NOTIFICATION_LIMITS.jsonDepth) {
    throw new InvariantViolationException(
      `Notification parameters exceed maximum JSON depth ${NOTIFICATION_LIMITS.jsonDepth} at ${path}`
    )
  }

  if (value === null || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new InvariantViolationException(
        `Notification parameter at ${path} must be a finite number`
      )
    }
    return value
  }

  if (typeof value === 'string') {
    const bytes = utf8Encoder.encode(value).byteLength
    if (bytes > NOTIFICATION_LIMITS.jsonStringBytes) {
      throw new InvariantViolationException(
        `Notification JSON string exceeds 2 KiB (2048 bytes) at ${path}`
      )
    }
    if (/https?:\/\//iu.test(value)) {
      throw new InvariantViolationException(`Producer-controlled URL is forbidden at ${path}`)
    }
    return value
  }

  if (Array.isArray(value)) {
    if (value.length > NOTIFICATION_LIMITS.jsonArrayLength) {
      throw new InvariantViolationException(
        `Notification JSON array exceeds ${NOTIFICATION_LIMITS.jsonArrayLength} items at ${path}`
      )
    }

    return value.map((item, index) => validateJsonValue(item, depth + 1, `${path}[${index}]`))
  }

  if (!isPlainObject(value)) {
    throw new InvariantViolationException(
      `Notification parameter at ${path} must be JSON serializable`
    )
  }

  const keys = Object.keys(value)
  if (keys.length > NOTIFICATION_LIMITS.jsonObjectKeys) {
    throw new InvariantViolationException(
      `Notification JSON object exceeds ${NOTIFICATION_LIMITS.jsonObjectKeys} keys at ${path}`
    )
  }

  const normalized: Record<string, NotificationJsonValue> = {}
  for (const key of keys.sort()) {
    if (/(?:^|_)(?:url|href|link|redirect_url)(?:$|_)/iu.test(key)) {
      throw new InvariantViolationException(
        `Producer-controlled URL field "${key}" is forbidden at ${path}`
      )
    }

    const nested = value[key]
    if (nested === undefined) {
      continue
    }
    normalized[key] = validateJsonValue(nested, depth + 1, `${path}.${key}`)
  }

  return normalized
}

export function normalizeNotificationParameters(
  value: unknown
): Record<string, NotificationJsonValue> {
  if (!isPlainObject(value)) {
    throw new InvariantViolationException('Notification parameters must be a JSON object')
  }

  const normalized = validateJsonValue(value, 1, 'parameters')
  if (normalized === null || Array.isArray(normalized) || typeof normalized !== 'object') {
    throw new InvariantViolationException('Notification parameters must be a JSON object')
  }

  const bytes = utf8Encoder.encode(JSON.stringify(normalized)).byteLength
  if (bytes > NOTIFICATION_LIMITS.parameterBytes) {
    throw new InvariantViolationException(
      `Notification parameters exceed ${NOTIFICATION_LIMITS.parameterBytes} serialized UTF-8 bytes`
    )
  }

  return normalized
}

export function canonicalNotificationJson(value: NotificationJsonValue): string {
  return JSON.stringify(value)
}
