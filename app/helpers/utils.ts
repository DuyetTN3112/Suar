/**
 * TypeScript Helper Utilities
 */

/**
 * Exhaustiveness checking helper (Level 9)
 * Use this in the default case of a switch or final else of if/else chain.
 * If all cases are handled, the variable passed will be of type 'never'.
 * If a case is missed, TypeScript will show a compile-time error.
 *
 * @example
 * ```typescript
 * type Status = 'pending' | 'success';
 * switch (status) {
 *   case 'pending': return ...;
 *   case 'success': return ...;
 *   default: assertNever(status); // Error if a new status is added but not handled here
 * }
 * ```
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${String(x)}`)
}
