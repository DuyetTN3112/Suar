import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

export function buildTaskRouteRequest(params: unknown): { readonly taskId: string } {
  const value = params && typeof params === 'object' && !Array.isArray(params)
    ? (params as Record<string, unknown>)['taskId']
    : undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue('taskId', 'taskId is required', 'ROUTE_PARAMETER_REQUIRED'),
    ])
  }
  return { taskId: value.trim() }
}

export function buildPrefillTaskRequirementsRouteRequest(params: unknown): {
  readonly taskId: string
} {
  return buildTaskRouteRequest(params)
}
