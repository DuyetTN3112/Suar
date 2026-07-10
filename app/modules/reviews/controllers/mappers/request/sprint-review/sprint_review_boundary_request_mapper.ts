import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'
import type {
  CreateSprintReviewDisputeCommentDTO,
} from '#modules/reviews/actions/commands/disputes/create_sprint_review_dispute_comment_command'
import type { ReportSprintReviewDisputeDTO } from '#modules/reviews/actions/commands/disputes/report_sprint_review_dispute_command'
import type {
  SubmitSprintEnvironmentReviewInput,
  SubmitSprintManagerReviewInput,
  SubmitSprintReviewPackageDTO,
} from '#modules/reviews/actions/commands/sprint-review/submit_sprint_review_package_command'

type RequestLike = {
  input(key: string, fallback?: unknown): unknown
}
type JsonRecord = Record<string, unknown>

const DISPUTE_VISIBILITIES = new Set(['all_parties', 'admin_only'])
const ENVIRONMENT_TARGET_TYPES = new Set(['project', 'organization'])
const SPRINT_DISPUTE_REVIEW_TYPES = new Set(['manager_review', 'environment_review'])
const SPRINT_DISPUTE_OUTCOMES = new Set(['add_context', 'remove_review', 'request_admin_review', 'other'])

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function routeParam(params: unknown, name: string, issues: ValidationIssue[]): string {
  const value = isRecord(params) ? params[name] : undefined
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 200) {
    issues.push(validationIssue(name, `${name} is required`, 'ROUTE_PARAMETER_REQUIRED'))
    return ''
  }
  return value.trim()
}

function requiredString(value: unknown, path: string, issues: ValidationIssue[]): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 8000) {
    issues.push(validationIssue(path, `${path} is required`, 'REQUEST_STRING_REQUIRED'))
    return ''
  }
  return value.trim()
}

function aliasedInput(request: RequestLike, camelKey: string, snakeKey: string): unknown {
  return request.input(camelKey, request.input(snakeKey))
}

function throwIfInvalid(issues: ValidationIssue[]): void {
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
}

export function buildCreateSprintReviewDisputeCommentRequest(
  params: unknown,
  request: RequestLike
): CreateSprintReviewDisputeCommentDTO {
  const issues: ValidationIssue[] = []
  const disputeId = routeParam(params, 'disputeId', issues)
  const body = requiredString(request.input('body'), 'body', issues)
  const visibilityValue = request.input('visibility', 'all_parties')
  if (typeof visibilityValue !== 'string' || !DISPUTE_VISIBILITIES.has(visibilityValue)) {
    issues.push(
      validationIssue(
        'visibility',
        'visibility must be all_parties or admin_only',
        'ENUM_INVALID'
      )
    )
  }
  throwIfInvalid(issues)

  return {
    dispute_id: disputeId,
    body,
    visibility: visibilityValue === 'admin_only' ? 'admin_only' : 'all_parties',
  }
}

export function buildReportSprintReviewDisputeRequest(
  params: unknown,
  request: RequestLike
): ReportSprintReviewDisputeDTO {
  const issues: ValidationIssue[] = []
  const disputeId = routeParam(params, 'disputeId', issues)
  const escalationReason = requiredString(
    aliasedInput(request, 'escalationReason', 'escalation_reason'),
    'escalationReason',
    issues
  )
  throwIfInvalid(issues)

  return { dispute_id: disputeId, escalation_reason: escalationReason }
}

export function buildReviewDisputeCaseFileRequest(params: unknown): { readonly dispute_id: string } {
  const issues: ValidationIssue[] = []
  const disputeId = routeParam(params, 'disputeId', issues)
  throwIfInvalid(issues)
  return { dispute_id: disputeId }
}

export function buildCreateReviewDisputeEvidenceRequest(params: unknown, request: RequestLike) {
  const issues: ValidationIssue[] = []
  const disputeId = routeParam(params, 'disputeId', issues)
  const evidenceType = requiredString(
    request.input('evidenceType', request.input('evidence_type')),
    'evidenceType',
    issues
  )
  const url = requiredString(request.input('url'), 'url', issues)
  const title = optionalString(request.input('title'), 'title', issues)
  const description = optionalString(request.input('description'), 'description', issues)
  throwIfInvalid(issues)
  return { dispute_id: disputeId, evidence_type: evidenceType, url, title, description }
}

export function buildCreateSprintReviewDisputeRequest(params: unknown, request: RequestLike) {
  const issues: ValidationIssue[] = []
  const packageId = routeParam(params, 'packageId', issues)
  const disputeReason = requiredString(
    aliasedInput(request, 'disputeReason', 'dispute_reason'),
    'disputeReason',
    issues
  )
  const requestedOutcome = requiredString(
    aliasedInput(request, 'requestedOutcome', 'requested_outcome') ?? 'other',
    'requestedOutcome',
    issues
  )
  if (!SPRINT_DISPUTE_OUTCOMES.has(requestedOutcome)) {
    issues.push(validationIssue('requestedOutcome', 'requestedOutcome is invalid', 'ENUM_INVALID'))
  }
  const reviewTypeValue = aliasedInput(request, 'disputeReviewType', 'dispute_review_type')
  if (reviewTypeValue !== undefined && (typeof reviewTypeValue !== 'string' || !SPRINT_DISPUTE_REVIEW_TYPES.has(reviewTypeValue))) {
    issues.push(validationIssue('disputeReviewType', 'disputeReviewType is invalid', 'ENUM_INVALID'))
  }
  throwIfInvalid(issues)
  return {
    package_id: packageId,
    dispute_reason: disputeReason,
    requested_outcome: requestedOutcome as 'add_context' | 'remove_review' | 'request_admin_review' | 'other',
    ...(reviewTypeValue === undefined ? {} : { dispute_review_type: reviewTypeValue as 'manager_review' | 'environment_review' }),
  }
}

export function buildSubmitSprintReviewPackageRequest(
  params: unknown,
  request: RequestLike
): SubmitSprintReviewPackageDTO {
  const issues: ValidationIssue[] = []
  const packageId = routeParam(params, 'packageId', issues)
  const managerReviews = mapManagerReviews(
    aliasedInput(request, 'managerReviews', 'manager_reviews'),
    issues
  )
  const environmentReviews = mapEnvironmentReviews(
    aliasedInput(request, 'environmentReviews', 'environment_reviews'),
    issues
  )
  throwIfInvalid(issues)

  return {
    package_id: packageId,
    manager_reviews: managerReviews,
    environment_reviews: environmentReviews,
  }
}

function mapManagerReviews(value: unknown, issues: ValidationIssue[]): SubmitSprintManagerReviewInput[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    issues.push(validationIssue('managerReviews', 'managerReviews must be an array', 'REQUEST_ARRAY_REQUIRED'))
    return []
  }

  return value.map((entry, index) => {
    const path = `managerReviews.${index}`
    const record = recordAt(entry, path, issues)
    const targetUserId = requiredString(
      record?.['targetUserId'] ?? record?.['target_user_id'],
      `${path}.targetUserId`,
      issues
    )
    const rating = requiredRating(record?.['rating'], `${path}.rating`, issues)
    const dimensions = optionalRecord(record?.['dimensions'], `${path}.dimensions`, issues)
    const comment = optionalString(record?.['comment'], `${path}.comment`, issues)
    const anonymous = optionalBoolean(
      record?.['isAnonymousToTarget'] ?? record?.['is_anonymous_to_target'],
      `${path}.isAnonymousToTarget`,
      true,
      issues
    )

    return {
      target_user_id: targetUserId,
      rating,
      dimensions,
      comment,
      is_anonymous_to_target: anonymous,
    }
  })
}

function mapEnvironmentReviews(
  value: unknown,
  issues: ValidationIssue[]
): SubmitSprintEnvironmentReviewInput[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    issues.push(
      validationIssue(
        'environmentReviews',
        'environmentReviews must be an array',
        'REQUEST_ARRAY_REQUIRED'
      )
    )
    return []
  }

  return value.map((entry, index) => {
    const path = `environmentReviews.${index}`
    const record = recordAt(entry, path, issues)
    const targetType = requiredString(
      record?.['targetType'] ?? record?.['target_type'],
      `${path}.targetType`,
      issues
    )
    if (targetType && !ENVIRONMENT_TARGET_TYPES.has(targetType)) {
      issues.push(validationIssue(`${path}.targetType`, 'targetType is invalid', 'ENUM_INVALID'))
    }
    const targetId = requiredString(
      record?.['targetId'] ?? record?.['target_id'],
      `${path}.targetId`,
      issues
    )
    const rating = requiredRating(record?.['rating'], `${path}.rating`, issues)
    const dimensions = optionalRecord(record?.['dimensions'], `${path}.dimensions`, issues)
    const comment = optionalString(record?.['comment'], `${path}.comment`, issues)
    const anonymous = optionalBoolean(
      record?.['isAnonymousPublicly'] ?? record?.['is_anonymous_publicly'],
      `${path}.isAnonymousPublicly`,
      true,
      issues
    )

    return {
      target_type: targetType as SubmitSprintEnvironmentReviewInput['target_type'],
      target_id: targetId,
      rating,
      dimensions,
      comment,
      is_anonymous_publicly: anonymous,
    }
  })
}

function recordAt(value: unknown, path: string, issues: ValidationIssue[]): JsonRecord | undefined {
  if (!isRecord(value)) {
    issues.push(validationIssue(path, `${path} must be an object`, 'REQUEST_OBJECT_REQUIRED'))
    return undefined
  }
  return value
}

function requiredRating(value: unknown, path: string, issues: ValidationIssue[]): number {
  const rating = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
    ? Number(value)
    : Number.NaN
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    issues.push(validationIssue(path, `${path} must be an integer from 1 to 5`, 'RATING_INVALID'))
    return 0
  }
  return rating
}

function optionalRecord(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): Record<string, unknown> | null {
  if (value === undefined || value === null) return null
  if (!isRecord(value)) {
    issues.push(validationIssue(path, `${path} must be an object or null`, 'REQUEST_OBJECT_INVALID'))
    return null
  }
  return value
}

function optionalString(value: unknown, path: string, issues: ValidationIssue[]): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > 8000) {
    issues.push(validationIssue(path, `${path} must be a string or null`, 'REQUEST_STRING_INVALID'))
    return null
  }
  return value
}

function optionalBoolean(
  value: unknown,
  path: string,
  fallback: boolean,
  issues: ValidationIssue[]
): boolean {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'boolean') {
    issues.push(validationIssue(path, `${path} must be a boolean`, 'REQUEST_BOOLEAN_INVALID'))
    return fallback
  }
  return value
}
