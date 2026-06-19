import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue(field, `${field} is required`, 'REQUEST_FIELD_REQUIRED'),
    ])
  }
  return value.trim()
}

function optionalPath(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    throw ValidationException.fromIssues([
      validationIssue('currentPath', 'currentPath is invalid', 'REQUEST_FIELD_INVALID'),
    ])
  }
  return value
}

export function buildOrganizationContextSwitchRequest(request: {
  input: (key: string) => unknown
}): { readonly organizationId: string; readonly currentPath?: string } {
  const organizationId = requiredString(
    request.input('organizationId') ?? request.input('organization_id'),
    'organizationId'
  )
  const currentPath = optionalPath(request.input('currentPath') ?? request.input('current_path'))
  return currentPath === undefined ? { organizationId } : { organizationId, currentPath }
}

export function buildOrganizationSwitchRouteRequest(params: unknown): {
  readonly organizationId: string
} {
  const value =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)['organizationId']
      : undefined
  return { organizationId: requiredString(value, 'organizationId') }
}
