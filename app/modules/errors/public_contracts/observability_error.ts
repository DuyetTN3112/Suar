import {
  sanitizeErrorDetails,
  sanitizeErrorLogText,
} from '#modules/errors/public_contracts/error_sanitization'

const ERROR_CLASS_LIMIT = 256
const ERROR_MESSAGE_LIMIT = 2_048
const DETAIL_KEY_LIMIT = 256

function neutralizeControlCharacters(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeErrorLogText(value)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => neutralizeControlCharacters(entry))
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      output[sanitizeErrorLogText(key, DETAIL_KEY_LIMIT)] = neutralizeControlCharacters(entry)
    }
    return output
  }

  return value
}

function serializeObjectDetails(error: object): Record<string, unknown> {
  const details = sanitizeErrorDetails(error as Record<string, unknown>) ?? {}
  return neutralizeControlCharacters(details) as Record<string, unknown>
}

/**
 * Builds the bounded, redacted diagnostic shape persisted by platform events.
 *
 * This contract intentionally excludes stack traces and arbitrary fields from
 * native Error instances. Unknown object failures keep their useful structure,
 * but all keys and values are bounded, secret-aware, and control-character safe.
 */
export function serializeObservabilityError(error: unknown): Record<string, unknown> | null {
  if (error instanceof Error) {
    return {
      class: sanitizeErrorLogText(error.name || 'Error', ERROR_CLASS_LIMIT),
      message: sanitizeErrorLogText(error.message, ERROR_MESSAGE_LIMIT),
    }
  }

  if (typeof error === 'string') {
    return {
      class: 'UnknownError',
      message: sanitizeErrorLogText(error, ERROR_MESSAGE_LIMIT),
    }
  }

  if (error && typeof error === 'object') {
    return {
      class: 'UnknownError',
      details: serializeObjectDetails(error),
    }
  }

  return null
}
