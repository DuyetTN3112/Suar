export interface TimestampCursorPayload {
  createdAt: string
  id: string
}

export function encodeTimestampCursor(payload: TimestampCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeTimestampCursor(
  cursor: string | undefined | null
): TimestampCursorPayload | null {
  if (!cursor || typeof cursor !== 'string') {
    return null
  }

  try {
    return parseTimestampCursorPayload(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown
    )
  } catch {
    return null
  }
}

function parseTimestampCursorPayload(value: unknown): TimestampCursorPayload | null {
  if (!value || typeof value !== 'object') return null

  const payload = value as Partial<TimestampCursorPayload>
  if (!isNonEmptyString(payload.createdAt) || !isNonEmptyString(payload.id)) {
    return null
  }
  return { createdAt: payload.createdAt, id: payload.id }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}
