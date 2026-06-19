import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

export function buildMyInvitationRouteRequest(params: unknown): {
  readonly organizationId: string
} {
  const value =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)['organizationId']
      : undefined

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue('organizationId', 'organizationId is required', 'ROUTE_PARAMETER_REQUIRED'),
    ])
  }

  return { organizationId: value.trim() }
}
