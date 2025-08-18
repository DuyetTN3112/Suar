import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

/**
 * ID Utility Helper — UUIDv7 Only
 *
 * PostgreSQL v3: All IDs are UUIDv7 strings.
 * Numeric ID support has been removed.
 *
 * @module IdUtils
 * @example
 * ```typescript
 * import { parseId, isValidId } from '#libs/id_utils'
 *
 * // Controller: Parse route param
 * const id = parseId(params.id)
 *
 * // DTO: Validate ID
 * if (!isValidId(data.organization_id)) throw new Error('Invalid ID')
 * ```
 */

/**
 * UUID v4/v7 pattern
 * Matches both UUIDv4 (random) and UUIDv7 (time-sorted)
 */
const UUID_REGEX = /^[\da-f]{8}-[\da-f]{4}-[1-7][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i

/**
 * Parse an ID from a route parameter or request body.
 *
 * Only accepts UUID strings (UUIDv7 from PostgreSQL).
 *
 * @param value - Raw value from params, body, or query string
 * @returns string — UUID string
 * @throws ValidationException if value is empty/undefined/null or not a valid UUID
 */
export function parseId(value: string | number | undefined | null): DatabaseId {
  if (value === undefined || value === null || value === '') {
    throw new ValidationException('ID is required')
  }

  const strValue = String(value)

  if (UUID_REGEX.test(strValue)) {
    return strValue
  }

  throw new ValidationException(`Invalid ID format: ${strValue}. Expected UUID.`)
}

/**
 * Validate whether a value is a valid DatabaseId (UUID string).
 *
 * @param value - Value to validate
 * @returns true if valid UUID
 */
export function isValidId(value: unknown): value is DatabaseId {
  if (typeof value === 'string') {
    return UUID_REGEX.test(value)
  }

  return false
}

/**
 * Convert DatabaseId to string (safe identity function for UUIDv7).
 *
 * @param id - DatabaseId to convert
 * @returns string representation
 */
export function toStringId(id: DatabaseId): string {
  return id
}

/**
 * Compare two DatabaseIds for equality.
 *
 * @param a - First ID
 * @param b - Second ID
 * @returns true if equal
 */
export function isSameId(a: DatabaseId, b: DatabaseId): boolean {
  return a === b
}

/**
 * Validate and throw for required ID fields in DTOs.
 *
 * @param value - The ID value to validate
 * @param fieldName - Name of the field (for error messages)
 * @throws Error with descriptive message if invalid
 */
export function validateRequiredId(value: unknown, fieldName: string): asserts value is DatabaseId {
  if (value === undefined || value === null) {
    throw ValidationException.field(fieldName, `${fieldName} là bắt buộc`)
  }

  if (!isValidId(value)) {
    throw ValidationException.field(fieldName, `${fieldName} không hợp lệ`)
  }
}

/**
 * Validate optional ID fields in DTOs.
 *
 * @param value - The ID value to validate (may be undefined/null)
 * @param fieldName - Name of the field (for error messages)
 * @throws Error if value is provided but invalid
 */
export function validateOptionalId(
  value: unknown,
  fieldName: string
): asserts value is string | undefined {
  if (value === undefined || value === null) {
    return
  }

  if (!isValidId(value)) {
    throw ValidationException.field(fieldName, `${fieldName} không hợp lệ`)
  }
}
