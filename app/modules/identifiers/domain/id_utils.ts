import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

const UUID_REGEX = /^[\da-f]{8}-[\da-f]{4}-[1-7][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i

/**
 * Compare two IDs for equality (string comparison).
 */
export function isSameId(a: string, b: string): boolean {
  return a === b
}

export function parseId(value: string | number | undefined | null): DatabaseId {
  if (value === undefined || value === null || value === '') {
    throw new ValidationException('ID is required')
  }

  const parsedValue = String(value)

  if (UUID_REGEX.test(parsedValue)) {
    return parsedValue
  }

  throw new ValidationException(`Invalid ID format: ${parsedValue}. Expected UUID.`)
}

export function isValidId(value: unknown): value is DatabaseId {
  return typeof value === 'string' && UUID_REGEX.test(value)
}
