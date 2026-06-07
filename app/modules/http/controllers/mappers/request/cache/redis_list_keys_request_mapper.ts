import ValidationException from '#modules/errors/public_contracts/validation_exception'

interface RequestLike {
  input(key: string, defaultValue?: unknown): unknown
}

function boundedString(value: unknown, field: string, fallback: string): string {
  const actual = value === undefined ? fallback : value
  if (typeof actual !== 'string') throw ValidationException.field(field, `${field} must be a string`)
  if (actual.length > 200) throw ValidationException.field(field, `${field} cannot exceed 200 characters`)
  return actual
}

export function buildRedisListKeysRequest(request: RequestLike): {
  pattern: string
  cursor: string
  count: number
} {
  const rawCount = request.input('count', 100)
  const count = typeof rawCount === 'number' ? rawCount : typeof rawCount === 'string' && rawCount.trim() !== '' ? Number(rawCount) : Number.NaN
  if (!Number.isSafeInteger(count) || count < 1 || count > 1000) {
    throw ValidationException.field('count', 'count must be an integer between 1 and 1000')
  }
  return {
    pattern: boundedString(request.input('pattern', '*'), 'pattern', '*'),
    cursor: boundedString(request.input('cursor', '0'), 'cursor', '0'),
    count,
  }
}
