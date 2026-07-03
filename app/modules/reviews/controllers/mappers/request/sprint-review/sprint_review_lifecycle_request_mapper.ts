import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

type RequestLike = {
  input(key: string, fallback?: unknown): unknown
}

function routeParam(params: unknown, name: string): string {
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

function optionalRouteParam(params: unknown, name: string): string | undefined {
  const value =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)[name]
      : undefined

  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue(name, `${name} must be a string`, 'ROUTE_PARAMETER_INVALID'),
    ])
  }

  return value.trim()
}

export function buildCloseProjectSprintReviewRequest(params: unknown): {
  readonly sprintId: string
  readonly projectId?: string
} {
  const sprintId = routeParam(params, 'sprintId')
  const projectId = optionalRouteParam(params, 'projectId')
  return projectId === undefined ? { sprintId } : { sprintId, projectId }
}

export function buildCloseProjectSprintReviewPeriodRequest(params: unknown): {
  readonly sprintId: string
} {
  return { sprintId: routeParam(params, 'sprintId') }
}

export function buildExpireSprintReviewPackagesRequest(
  params: unknown,
  request: RequestLike
): {
  readonly sprintId: string
  readonly reason: string | null
} {
  const reason = request.input('reason')
  if (reason !== undefined && reason !== null && typeof reason !== 'string') {
    throw ValidationException.fromIssues([
      validationIssue('reason', 'reason must be a string', 'INPUT_INVALID'),
    ])
  }

  return {
    sprintId: routeParam(params, 'sprintId'),
    reason: reason ?? null,
  }
}
