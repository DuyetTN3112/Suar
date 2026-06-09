import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

export function buildOrganizationMemberRouteRequest(params: unknown): { readonly memberId: string } {
  const value = params && typeof params === 'object' && !Array.isArray(params)
    ? (params as Record<string, unknown>)['memberId']
    : undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue('memberId', 'memberId is required', 'ROUTE_PARAMETER_REQUIRED'),
    ])
  }
  return { memberId: value.trim() }
}

export function buildOrganizationJoinRequestRouteRequest(params: unknown): {
  readonly joinRequestId: string
} {
  const value =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)['joinRequestId']
      : undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue(
        'joinRequestId',
        'joinRequestId is required',
        'ROUTE_PARAMETER_REQUIRED'
      ),
    ])
  }
  return { joinRequestId: value.trim() }
}
