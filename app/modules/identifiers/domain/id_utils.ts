/**
 * Domain ID Utilities — Pure functions, NO framework dependencies.
 *
 * Identifier semantics belong to a dedicated domain capability, not shared.
 */

/**
 * Compare two IDs for equality (string comparison).
 */
export function isSameId(a: string, b: string): boolean {
  return a === b
}
