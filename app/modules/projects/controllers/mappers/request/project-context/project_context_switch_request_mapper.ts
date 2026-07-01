import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

export function buildProjectContextSwitchRequest(request: {
  input: (key: string) => unknown
}): { readonly projectId: string; readonly currentPath?: string } {
  const value = request.input('projectId') ?? request.input('project_id')
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue('projectId', 'projectId is required', 'REQUEST_FIELD_REQUIRED'),
    ])
  }
  const currentPath = request.input('currentPath') ?? request.input('current_path')
  if (currentPath !== undefined && currentPath !== null && typeof currentPath !== 'string') {
    throw ValidationException.fromIssues([
      validationIssue('currentPath', 'currentPath is invalid', 'REQUEST_FIELD_INVALID'),
    ])
  }
  return {
    projectId: value.trim(),
    ...(currentPath === undefined || currentPath === null ? {} : { currentPath }),
  }
}
