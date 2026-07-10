import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'

type RequestLike = {
  input(key: string, fallback?: unknown): unknown
}

type RecordLike = Record<string, unknown>

export interface SubmitTaskReviewWorkflowRequest {
  readonly taskId: string
  readonly body: string
}

export interface RespondTaskReviewWorkflowRequest {
  readonly workflowId: string
  readonly body: string
}

export interface ReportTaskReviewWorkflowRequest {
  readonly workflowId: string
  readonly reason: string
}

export function buildSubmitTaskReviewWorkflowRequest(
  params: unknown,
  request: RequestLike
): SubmitTaskReviewWorkflowRequest {
  const issues: ValidationIssue[] = []
  const taskId = requiredRouteParam(params, 'taskId', issues)
  const body = requiredText(request.input('body'), 'body', issues)
  throwIfInvalid(issues)

  return { taskId, body }
}

export function buildRespondTaskReviewWorkflowRequest(
  params: unknown,
  request: RequestLike
): RespondTaskReviewWorkflowRequest {
  const issues: ValidationIssue[] = []
  const workflowId = requiredRouteParam(params, 'workflowId', issues)
  const body = requiredText(request.input('body'), 'body', issues)
  throwIfInvalid(issues)

  return { workflowId, body }
}

export function buildReportTaskReviewWorkflowRequest(
  params: unknown,
  request: RequestLike
): ReportTaskReviewWorkflowRequest {
  const issues: ValidationIssue[] = []
  const workflowId = requiredRouteParam(params, 'workflowId', issues)
  const reason = requiredText(request.input('reason'), 'reason', issues)
  throwIfInvalid(issues)

  return { workflowId, reason }
}

function requiredRouteParam(
  params: unknown,
  name: string,
  issues: ValidationIssue[]
): string {
  const value = isRecord(params) ? params[name] : undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(name, `${name} is required`, 'ROUTE_PARAMETER_REQUIRED'))
    return ''
  }

  return value.trim()
}

function requiredText(value: unknown, path: string, issues: ValidationIssue[]): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(path, `${path} is required`, 'REQUEST_STRING_REQUIRED'))
    return ''
  }

  return value.trim()
}

function isRecord(value: unknown): value is RecordLike {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function throwIfInvalid(issues: ValidationIssue[]): void {
  if (issues.length > 0) {
    throw ValidationException.fromIssues(issues)
  }
}
