/**
 * Domain ID Utilities — Pure functions, NO framework dependencies.
 *
 * This module provides ID comparison functions for use within the domain layer.
 * It is intentionally framework-free so domain rules stay pure and testable.
 */

/**
 * Compare two IDs for equality (string comparison).
 *
 * @param a - First ID
 * @param b - Second ID
 * @returns true if equal
 */
export function isSameId(a: string, b: string): boolean {
  return String(a) === String(b)
}
