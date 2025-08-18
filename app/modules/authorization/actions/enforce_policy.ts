import {
  BusinessPolicyViolationException,
  ForbiddenPolicyViolationException,
} from '#modules/authorization/exceptions/policy_violation_exception'
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'

/**
 * Bridge pure PolicyResult to an authorization-domain exception.
 */
export function enforcePolicy(result: PolicyResult): void {
  if (result.allowed) return

  if (result.code === 'FORBIDDEN') {
    throw new ForbiddenPolicyViolationException(result.reason)
  }

  throw new BusinessPolicyViolationException(result.code, result.reason)
}
