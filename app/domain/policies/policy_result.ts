/**
 * PolicyResult — Pure discriminated union for business rule decisions.
 *
 * 100% pure, 0 framework dependencies.
 * Used by all `rules/` modules to return allow/deny decisions.
 *
 * Commands map PolicyResult -> exceptions via `enforcePolicy()` (separate file).
 *
 * @example
 * ```typescript
 * import type { PolicyResult } from '#domain/policies/policy_result'
 * import { PolicyResult as PR } from '#domain/policies/policy_result'
 *
 * export function canDeleteTask(ctx: ...): PolicyResult {
 *   if (isSameId(ctx.taskCreatorId, ctx.actorId)) return PR.allow()
 *   return PR.deny('You do not have permission to delete this task')
 * }
 * ```
 */

/**
 * Result of a business rule evaluation.
 * - `{ allowed: true }` — action is permitted
 * - `{ allowed: false, reason, code }` — action is denied with explanation
 */
export type PolicyResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: PolicyDenyCode }

export type PolicyDenyCode = 'FORBIDDEN' | 'BUSINESS_RULE' | 'INVALID_STATE'

/**
 * Factory functions for creating PolicyResult values.
 */
export const PolicyResult = {
  allow(): PolicyResult {
    return { allowed: true }
  },

  deny(reason: string, code: PolicyDenyCode = 'FORBIDDEN'): PolicyResult {
    return { allowed: false, reason, code }
  },
} as const
