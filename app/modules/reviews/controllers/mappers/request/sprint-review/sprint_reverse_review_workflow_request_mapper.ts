import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'

type RequestLike = {
  input(key: string, fallback?: unknown): unknown
}

type RecordLike = Record<string, unknown>

export interface SubmitSprintReverseReviewWorkflowRequest {
  readonly workflow_id: string
  readonly rating: number
  readonly comment: string
}

export interface RespondSprintReverseReviewWorkflowRequest {
  readonly workflow_id: string
  readonly body: string
}

export interface ReportSprintReverseReviewWorkflowRequest {
  readonly workflow_id: string
  readonly body: string
}

export function buildSubmitSprintReverseReviewWorkflowRequest(
  params: unknown,
  request: RequestLike
): SubmitSprintReverseReviewWorkflowRequest {
  const issues: ValidationIssue[] = []
  const workflowId = requiredRouteParam(params, 'workflowId', issues)
  const rating = requiredRating(request.input('rating'), issues)
  const comment = requiredText(request.input('comment'), 'comment', issues)
  throwIfInvalid(issues)

  return { workflow_id: workflowId, rating, comment }
}

export function buildRespondSprintReverseReviewWorkflowRequest(
  params: unknown,
  request: RequestLike
): RespondSprintReverseReviewWorkflowRequest {
  const issues: ValidationIssue[] = []
  const workflowId = requiredRouteParam(params, 'workflowId', issues)
  const body = requiredText(request.input('body'), 'body', issues)
  throwIfInvalid(issues)

  return { workflow_id: workflowId, body }
}

export function buildReportSprintReverseReviewWorkflowRequest(
  params: unknown,
  request: RequestLike
): ReportSprintReverseReviewWorkflowRequest {
  const issues: ValidationIssue[] = []
  const workflowId = requiredRouteParam(params, 'workflowId', issues)
  const body = requiredText(request.input('body'), 'body', issues)
  throwIfInvalid(issues)

  return { workflow_id: workflowId, body }
}

function requiredRouteParam(
  params: unknown,
  name: string,
  issues: ValidationIssue[]
): string {
  const value = isRecord(params) ? params[name] : undefined
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 200) {
    issues.push(validationIssue(name, `${name} is required`, 'ROUTE_PARAMETER_REQUIRED'))
    return ''
  }

  return value.trim()
}

function requiredRating(value: unknown, issues: ValidationIssue[]): number {
  const rating =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : Number.NaN

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    issues.push(
      validationIssue('rating', 'rating must be an integer from 1 to 5', 'RATING_INVALID')
    )
    return 0
  }

  return rating
}

function requiredText(value: unknown, path: string, issues: ValidationIssue[]): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 8000) {
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
