import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import type { PolicyResult } from '#modules/policies/domain/policy_result'

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
