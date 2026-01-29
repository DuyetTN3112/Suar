const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|password|passphrase|token|secret|session|api[_-]?key|private[_-]?key)/i
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g
const JSON_SECRET_PATTERN =
  /"(password|passphrase|(?:access|refresh|id|client)[_-]?token|token|client[_-]?secret|secret|session(?:id)?|api[_-]?key|private[_-]?key)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/gi
const SINGLE_QUOTED_SECRET_PATTERN =
  /'(password|passphrase|(?:access|refresh|id|client)[_-]?token|token|client[_-]?secret|secret|session(?:id)?|api[_-]?key|private[_-]?key)'\s*:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/gi
const KEY_VALUE_SECRET_PATTERN =
  /(?<!["'])\b(password|passphrase|(?:access|refresh|id|client)[_-]?token|token|client[_-]?secret|secret|session(?:id)?|api[_-]?key|private[_-]?key)\b\s*[:=]\s*["']?([^\s"',;&}]+)/gi
const URI_CREDENTIAL_PATTERN = /\b([a-z][a-z0-9+.-]*:\/\/)([^/\s:@]+):([^@/\s]+)@/gi
const PROVIDER_TOKEN_PATTERN =
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{20,255}\b|\bglpat-[A-Za-z0-9_-]{20,}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}\b|\bAIza[A-Za-z0-9_-]{20,}\b|\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}\b|\bsk-[A-Za-z0-9_-]{16,}\b/g
const PRIVATE_KEY_BLOCK_PATTERN =
  /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g
const EMAIL_ADDRESS_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}\b/gi

const DEFAULT_TEXT_LIMIT = 2_048
const DEFAULT_STACK_LIMIT = 12_000
const MAX_DEPTH = 5
const MAX_OBJECT_KEYS = 50
const MAX_ARRAY_ITEMS = 50

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, Math.max(0, maxLength - 13))}…[TRUNCATED]`
}

function replaceLogControlCharacters(value: string): string {
  let sanitized = ''
  for (const character of value) {
    const codePoint = character.codePointAt(0)
    sanitized +=
      codePoint !== undefined &&
      (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f))
        ? ' '
        : character
  }
  return sanitized
}

export function sanitizeErrorText(value: unknown, maxLength: number = DEFAULT_TEXT_LIMIT): string {
  let text: string
  try {
    text = typeof value === 'string' ? value : String(value)
  } catch {
    text = '[UNSERIALIZABLE]'
  }

  const redacted = text
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [REDACTED]')
    .replace(JWT_PATTERN, '[REDACTED_JWT]')
    .replace(JSON_SECRET_PATTERN, '"$1":"[REDACTED]"')
    .replace(SINGLE_QUOTED_SECRET_PATTERN, "'$1':'[REDACTED]'")
    .replace(KEY_VALUE_SECRET_PATTERN, '$1=[REDACTED]')
    .replace(URI_CREDENTIAL_PATTERN, '$1[REDACTED]:[REDACTED]@')
    .replace(PROVIDER_TOKEN_PATTERN, '[REDACTED_TOKEN]')
    .replace(PRIVATE_KEY_BLOCK_PATTERN, '[REDACTED_PRIVATE_KEY]')
    .replace(EMAIL_ADDRESS_PATTERN, '[REDACTED_EMAIL]')
    .replaceAll('\0', ' ')

  return truncate(redacted, maxLength)
}

/**
 * Produces one bounded log-safe line. This additionally neutralizes control
 * characters so dependency diagnostics cannot forge adjacent log records.
 */
export function sanitizeErrorLogText(
  value: unknown,
  maxLength: number = DEFAULT_TEXT_LIMIT
): string {
  return replaceLogControlCharacters(sanitizeErrorText(value, maxLength))
}

function sanitizeValue(value: unknown, depth: number, visited: WeakSet<object>): unknown {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return sanitizeErrorText(value)
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return `[${typeof value}]`
  }

  if (depth >= MAX_DEPTH) {
    return '[MAX_DEPTH]'
  }

  if (typeof value !== 'object') {
    return sanitizeErrorText(value)
  }

  if (visited.has(value)) {
    return '[CIRCULAR]'
  }
  visited.add(value)

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '[INVALID_DATE]' : value.toISOString()
  }

  if (value instanceof URL) {
    return sanitizeRequestUrl(value.toString())
  }

  if (value instanceof Error) {
    return {
      name: sanitizeErrorText(value.name, 256),
      message: sanitizeErrorText(value.message),
      ...(value.stack ? { stack: sanitizeErrorText(value.stack, DEFAULT_STACK_LIMIT) } : {}),
    }
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((entry) => sanitizeValue(entry, depth + 1, visited))
  }

  const output: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
    output[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? '[REDACTED]'
      : sanitizeValue(entry, depth + 1, visited)
  }
  return output
}

export function sanitizeErrorDetails(
  details: Record<string, unknown> | undefined
): Record<string, unknown> | null {
  if (details === undefined) {
    return null
  }
  return sanitizeValue(details, 0, new WeakSet<object>()) as Record<string, unknown>
}

export function sanitizeLogValue(value: unknown): unknown {
  return sanitizeValue(value, 0, new WeakSet<object>())
}

export function sanitizeErrorStack(stack: string | undefined): string | null {
  return stack ? sanitizeErrorText(stack, DEFAULT_STACK_LIMIT) : null
}

export function sanitizeRequestUrl(url: string | null): string | null {
  if (!url) {
    return null
  }

  return sanitizeErrorText(url.split(/[?#]/u, 1)[0] ?? '', 2_048)
}
