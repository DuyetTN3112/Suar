/**
 * enforcePolicy — Bridge between pure PolicyResult and framework exceptions.
 *
 * This file imports AdonisJS exceptions, so it is NOT pure.
 * Keep it separate from policy_result.ts to preserve testability.
 *
 * @example
 * ```typescript
 * import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
 * import { canUpdateTask } from '#actions/tasks/rules/task_permission_policy'
 *
 * // In command:
 * enforcePolicy(canUpdateTask(ctx))
 * ```
 */
import type { PolicyResult } from './policy_result.js'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * Enforce a PolicyResult — throw the appropriate exception if denied.
 *
 * @param result - PolicyResult from a pure rule function
 * @throws ForbiddenException if code === 'FORBIDDEN'
 * @throws BusinessLogicException if code === 'BUSINESS_RULE' or 'INVALID_STATE'
 */
export function enforcePolicy(result: PolicyResult): void {
  if (result.allowed) return

  switch (result.code) {
    case 'FORBIDDEN':
      throw new ForbiddenException(result.reason)
    case 'BUSINESS_RULE':
    case 'INVALID_STATE':
      throw new BusinessLogicException(result.reason)
  }
}
