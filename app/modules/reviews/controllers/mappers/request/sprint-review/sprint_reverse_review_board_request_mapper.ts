import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'

type UnknownRecord = Record<string, unknown>

export interface SprintReverseReviewBoardRequest {
  projectId: string
  sprintId: string | null
  selectedWorkflowId: string | null
  workspaceMode: 'project' | 'personal'
}

function asRecord(value: unknown, path: string): UnknownRecord {
  if (value === undefined) return {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.fromIssues([
      validationIssue(path, `${path} must be an object`, 'REQUEST_OBJECT_REQUIRED'),
    ])
  }
  return value as UnknownRecord
}

function has(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function readOptionalString(
  record: UnknownRecord,
  key: string,
  issues: ValidationIssue[]
): string | undefined {
  if (!has(record, key)) return undefined
  const value = record[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(
      validationIssue(
        key,
        `${key} must be a non-empty string`,
        'REQUEST_STRING_INVALID'
      )
    )
    return undefined
  }
  return value.trim()
}

function throwIfInvalid(issues: readonly ValidationIssue[]): void {
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
}

/**
 * Resolve project context deliberately: route context is authoritative, then
 * an explicit query context, and finally the trusted session context.
 * Malformed explicit query values are still rejected instead of being ignored.
 */
export function buildSprintReverseReviewBoardRequest(
  params: unknown,
  query: unknown,
  sessionProjectId: unknown
): SprintReverseReviewBoardRequest {
  const issues: ValidationIssue[] = []
  const route = asRecord(params, 'params')
  const input = asRecord(query, 'query')

  const routeProjectId = readOptionalString(route, 'projectId', issues)
  const requestedProjectId = readOptionalString(input, 'project_id', issues)
  const sprintId = readOptionalString(input, 'sprint_id', issues)
  const selectedWorkflowId = readOptionalString(input, 'workflow_id', issues)
  const sessionProject =
    typeof sessionProjectId === 'string' && sessionProjectId.trim().length > 0
      ? sessionProjectId.trim()
      : undefined

  const projectId = routeProjectId ?? requestedProjectId ?? sessionProject
  if (!projectId) {
    issues.push(
      validationIssue(
        'projectId',
        'A project context is required',
        'PROJECT_CONTEXT_REQUIRED'
      )
    )
  }

  throwIfInvalid(issues)
  return {
    projectId: projectId as string,
    sprintId: sprintId ?? null,
    selectedWorkflowId: selectedWorkflowId ?? null,
    workspaceMode: routeProjectId ? 'project' : 'personal',
  }
}
