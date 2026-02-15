import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'

/**
 * ID Utility Helper — Sprint 3: UUID Migration Prep
 *
 * Chuẩn bị cho việc migrate từ MySQL INT AUTO_INCREMENT → PostgreSQL UUIDv7.
 *
 * Hiện tại DB sử dụng INT IDs, nhưng khi chuyển sang PostgreSQL,
 * tất cả IDs sẽ là UUIDv7 (string). Module này cung cấp helpers
 * để code hoạt động đúng với cả hai format.
 *
 * @module IdUtils
 * @example
 * ```typescript
 * import { parseId, isValidId, toNumericId } from '#libs/id_utils'
 *
 * // Controller: Parse route param
 * const id = parseId(params.id)
 *
 * // DTO: Validate ID
 * if (!isValidId(data.organization_id)) throw new Error('Invalid ID')
 *
 * // Backward compat: Convert to number (current MySQL phase)
 * const numId = toNumericId(id)
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
 * During MySQL phase: Returns number (auto-increment INT)
 * After PostgreSQL migration: Will return string (UUIDv7)
 *
 * @param value - Raw value from params, body, or query string
 * @returns DatabaseId — number (current) or string (future)
 * @throws Error if value is empty/undefined/null
 */
export function parseId(value: string | number | undefined | null): DatabaseId {
  if (value === undefined || value === null || value === '') {
    throw new ValidationException('ID is required')
  }

  // If it's already a number, return as-is
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      throw new ValidationException(`Invalid numeric ID: ${String(value)}`)
    }
    return value
  }

  // String — try numeric first (current MySQL phase)
  const numValue = Number(value)
  if (!Number.isNaN(numValue) && Number.isFinite(numValue) && numValue > 0) {
    return numValue
  }

  // String — check if valid UUID (future PostgreSQL phase)
  if (UUID_REGEX.test(value)) {
    return value
  }

  throw new ValidationException(`Invalid ID format: ${value}`)
}

/**
 * Validate whether a value is a valid DatabaseId.
 *
 * Works with both numeric IDs (current) and UUID strings (future).
 *
 * @param value - Value to validate
 * @returns true if valid
 */
export function isValidId(value: unknown): value is DatabaseId {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0
  }

  if (typeof value === 'string') {
    // Check numeric string
    const numValue = Number(value)
    if (!Number.isNaN(numValue) && Number.isFinite(numValue) && numValue > 0) {
      return true
    }
    // Check UUID
    return UUID_REGEX.test(value)
  }

  return false
}

/**
 * Convert DatabaseId to number (backward compatibility for current MySQL phase).
 *
 * WARNING: This function will be REMOVED after PostgreSQL migration.
 * Use sparingly — only where Lucid ORM requires numeric IDs.
 *
 * @param id - DatabaseId to convert
 * @returns number
 * @throws Error if ID is a UUID (cannot convert to number)
 * @deprecated Will be removed in Sprint 4 (PostgreSQL migration)
 */
export function toNumericId(id: DatabaseId): number {
  if (typeof id === 'number') {
    return id
  }

  const numValue = Number(id)
  if (!Number.isNaN(numValue) && Number.isFinite(numValue) && numValue > 0) {
    return numValue
  }

  throw new ValidationException(`Cannot convert UUID to numeric ID: ${String(id)}. Use string ID instead.`)
}

/**
 * Convert DatabaseId to string (safe for both MySQL INT and PostgreSQL UUID).
 *
 * @param id - DatabaseId to convert
 * @returns string representation
 */
export function toStringId(id: DatabaseId): string {
  return String(id)
}

/**
 * Compare two DatabaseIds for equality.
 *
 * Handles type coercion: `1 === "1"` → true
 *
 * @param a - First ID
 * @param b - Second ID
 * @returns true if equal
 */
export function isSameId(a: DatabaseId, b: DatabaseId): boolean {
  // Fast path: same type
  if (typeof a === typeof b) {
    return a === b
  }

  // Cross-type: compare as strings
  return String(a) === String(b)
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
): asserts value is number | string | undefined {
  if (value === undefined || value === null) {
    return
  }

  if (!isValidId(value)) {
    throw ValidationException.field(fieldName, `${fieldName} không hợp lệ`)
  }
}
