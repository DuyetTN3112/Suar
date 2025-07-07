import type { PolicyResult } from '#domain/policies/policy_result'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

/**
 * Bridge pure PolicyResult to framework exceptions.
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
