const CACHE_ENVELOPE_MARKER = '__suar_cache_envelope__'
const CACHE_ENVELOPE_VERSION = 1

interface CacheEnvelope {
  [CACHE_ENVELOPE_MARKER]: typeof CACHE_ENVELOPE_VERSION
  value: unknown
}

export class CacheValueCorruptionError extends Error {
  constructor(cause: unknown) {
    super('Cached JSON value is malformed', { cause })
    this.name = 'CacheValueCorruptionError'
  }
}

function isCacheEnvelope(value: unknown): value is CacheEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    candidate[CACHE_ENVELOPE_MARKER] === CACHE_ENVELOPE_VERSION && Object.hasOwn(candidate, 'value')
  )
}

/**
 * Encodes every cache value in a versioned envelope.
 *
 * The envelope removes the ambiguity between a string such as `"123"` and the
 * JSON number `123`, while the strict replacer prevents silent data loss for
 * values JSON cannot faithfully represent.
 */
export function encodeCacheValue(value: unknown): string {
  if (value === undefined) {
    throw new TypeError('Cache values cannot be undefined')
  }

  const envelope: CacheEnvelope = {
    [CACHE_ENVELOPE_MARKER]: CACHE_ENVELOPE_VERSION,
    value,
  }

  return JSON.stringify(envelope, (_key, nestedValue: unknown) => {
    if (
      typeof nestedValue === 'undefined' ||
      typeof nestedValue === 'bigint' ||
      typeof nestedValue === 'function' ||
      typeof nestedValue === 'symbol'
    ) {
      throw new TypeError(`Cache value contains unsupported type: ${typeof nestedValue}`)
    }
    if (typeof nestedValue === 'number' && !Number.isFinite(nestedValue)) {
      throw new TypeError('Cache values cannot contain non-finite numbers')
    }
    return nestedValue
  })
}

/**
 * Decodes the current envelope and remains read-compatible with legacy cache
 * entries written before the envelope was introduced.
 */
export function decodeCacheValue<T>(serialized: string): T {
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (isCacheEnvelope(parsed)) {
      return parsed.value as T
    }
    return parsed as T
  } catch (error) {
    const trimmed = serialized.trimStart()
    if (
      trimmed.startsWith('{') ||
      trimmed.startsWith('[') ||
      trimmed.startsWith('"') ||
      /^(?:true|false|null|-?\d)/u.test(trimmed)
    ) {
      throw new CacheValueCorruptionError(error)
    }

    return serialized as T
  }
}
