import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

function requiredRouteId(params: unknown, key: string): string {
  const value =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)[key]
      : undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue(key, `${key} is required`, 'ROUTE_PARAMETER_REQUIRED'),
    ])
  }
  return value.trim()
}

export function buildProjectMemberRouteRequest(params: unknown): { readonly userId: string } {
  return { userId: requiredRouteId(params, 'userId') }
}
