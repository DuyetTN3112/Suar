import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

function readRequiredRouteParam(params: unknown, name: string): string {
  const value =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)[name]
      : undefined

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue(name, `${name} is required`, 'ROUTE_PARAMETER_REQUIRED'),
    ])
  }

  return value.trim()
}

export function buildMarketplaceTaskRouteRequest(params: unknown): { readonly taskId: string } {
  return { taskId: readRequiredRouteParam(params, 'taskId') }
}

export function buildMarketplaceApplicationRouteRequest(params: unknown): {
  readonly applicationId: string
} {
  return { applicationId: readRequiredRouteParam(params, 'applicationId') }
}

export function buildMarketplaceMatchScoreRouteRequest(params: unknown): {
  readonly taskId: string
  readonly applicationId: string
} {
  return {
    taskId: readRequiredRouteParam(params, 'taskId'),
    applicationId: readRequiredRouteParam(params, 'applicationId'),
  }
}
