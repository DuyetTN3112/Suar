import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

export function buildApprovePendingMemberRequest(params: unknown): { readonly userId: string } {
  const value =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)['userId']
      : undefined

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue('userId', 'userId is required', 'ROUTE_PARAMETER_REQUIRED'),
    ])
  }

  return { userId: value.trim() }
}
