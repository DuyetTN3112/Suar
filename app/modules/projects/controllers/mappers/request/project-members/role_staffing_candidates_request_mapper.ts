import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

export interface RoleStaffingCandidatesRequest {
  readonly project_id: string
  readonly role_id: string
}

function readRouteId(params: unknown, key: 'projectId' | 'roleId') {
  const value = params && typeof params === 'object' && !Array.isArray(params)
    ? (params as Record<string, unknown>)[key]
    : undefined

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue(key, `${key} is required`, 'ROUTE_PARAMETER_REQUIRED'),
    ])
  }

  return value.trim()
}

export function buildRoleStaffingCandidatesRequest(params: unknown): RoleStaffingCandidatesRequest {
  return {
    project_id: readRouteId(params, 'projectId'),
    role_id: readRouteId(params, 'roleId'),
  }
}
