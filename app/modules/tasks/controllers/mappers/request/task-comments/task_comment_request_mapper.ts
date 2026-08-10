import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'

type TaskCommentRequest = Pick<HttpContext['request'], 'input'>

export type TaskCommentType =
  | 'normal'
  | 'blocker'
  | 'clarification'
  | 'status_update'
  | 'review_note'

export type TaskCommentVisibility = 'internal' | 'public' | 'reviewers_only'

export interface TaskCommentCreateRequest {
  task_id: string
  parent_comment_id: string | null
  body: string
  comment_type: TaskCommentType
  visibility: TaskCommentVisibility
  review_relevance?: boolean
}

export interface TaskCommentUpdateRequest {
  task_id: string
  comment_id: string
  body?: string
  comment_type?: TaskCommentType
  visibility?: TaskCommentVisibility
  review_relevance?: boolean
}

function paramsRecord(params: unknown): Record<string, unknown> | undefined {
  return params && typeof params === 'object' && !Array.isArray(params)
    ? (params as Record<string, unknown>)
    : undefined
}

function readInput(request: TaskCommentRequest, camelCaseKey: string, snakeCaseKey?: string): unknown {
  const camelValue: unknown = request.input(camelCaseKey) as unknown
  if (camelValue !== undefined) return camelValue
  return snakeCaseKey === undefined ? undefined : (request.input(snakeCaseKey) as unknown)
}

function requiredRouteParam(params: unknown, name: string, issues: ValidationIssue[]): string | undefined {
  const value = paramsRecord(params)?.[name]
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 200) {
    issues.push(validationIssue(name, `${name} is required`, 'ROUTE_PARAMETER_REQUIRED'))
    return undefined
  }
  return value.trim()
}

function optionalString(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  nullable = false,
  maxLength = 8000
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null && nullable) return null
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
    issues.push(validationIssue(path, `${path} must be a non-empty string`, 'REQUEST_STRING_INVALID'))
    return undefined
  }
  return value.trim()
}

function enumValue<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
  fallback: T,
  issues: ValidationIssue[]
): T {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    issues.push(validationIssue(path, `${path} has an invalid value`, 'REQUEST_ENUM_INVALID'))
    return fallback
  }
  return value as T
}

function optionalBoolean(value: unknown, path: string, issues: ValidationIssue[]): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    issues.push(validationIssue(path, `${path} must be a boolean`, 'REQUEST_BOOLEAN_INVALID'))
    return undefined
  }
  return value
}

function throwIfInvalid(issues: readonly ValidationIssue[]): void {
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
}

export function buildTaskCommentRouteRequest(params: unknown): { readonly taskId: string } {
  const issues: ValidationIssue[] = []
  const taskId = requiredRouteParam(params, 'taskId', issues)
  throwIfInvalid(issues)
  return { taskId: taskId as string }
}

export function buildTaskCommentMutationRouteRequest(params: unknown): {
  readonly taskId: string
  readonly commentId: string
} {
  const issues: ValidationIssue[] = []
  const taskId = requiredRouteParam(params, 'taskId', issues)
  const commentId = requiredRouteParam(params, 'commentId', issues)
  throwIfInvalid(issues)
  return { taskId: taskId as string, commentId: commentId as string }
}

export function buildCreateTaskCommentRequest(
  request: TaskCommentRequest,
  params: unknown
): TaskCommentCreateRequest {
  const issues: ValidationIssue[] = []
  const taskId = requiredRouteParam(params, 'taskId', issues)
  const bodyValue = readInput(request, 'body')
  const body = optionalString(bodyValue === undefined ? '' : bodyValue, 'body', issues)
  const parentCommentId = optionalString(
    readInput(request, 'parentCommentId', 'parent_comment_id'),
    'parentCommentId',
    issues,
    true
  )
  const commentType = enumValue(
    readInput(request, 'commentType', 'comment_type'),
    'commentType',
    ['normal', 'blocker', 'clarification', 'status_update', 'review_note'] as const,
    'normal',
    issues
  )
  const visibility = enumValue(
    readInput(request, 'visibility'),
    'visibility',
    ['internal', 'public', 'reviewers_only'] as const,
    'internal',
    issues
  )
  const reviewRelevance = optionalBoolean(
    readInput(request, 'reviewRelevance', 'review_relevance'),
    'reviewRelevance',
    issues
  )

  throwIfInvalid(issues)
  return {
    task_id: taskId as string,
    parent_comment_id: parentCommentId ?? null,
    body: body as string,
    comment_type: commentType,
    visibility,
    ...(reviewRelevance !== undefined ? { review_relevance: reviewRelevance } : {}),
  }
}

export function buildUpdateTaskCommentRequest(
  request: TaskCommentRequest,
  params: unknown
): TaskCommentUpdateRequest {
  const issues: ValidationIssue[] = []
  const taskId = requiredRouteParam(params, 'taskId', issues)
  const commentId = requiredRouteParam(params, 'commentId', issues)
  const bodyValue = readInput(request, 'body')
  const body = bodyValue === undefined ? undefined : optionalString(bodyValue, 'body', issues)
  const commentTypeValue = readInput(request, 'commentType', 'comment_type')
  const commentType =
    commentTypeValue === undefined
      ? undefined
      : enumValue(
          commentTypeValue,
          'commentType',
          ['normal', 'blocker', 'clarification', 'status_update', 'review_note'] as const,
          'normal',
          issues
        )
  const visibilityValue = readInput(request, 'visibility')
  const visibility =
    visibilityValue === undefined
      ? undefined
      : enumValue(
          visibilityValue,
          'visibility',
          ['internal', 'public', 'reviewers_only'] as const,
          'internal',
          issues
        )
  const reviewRelevance = optionalBoolean(
    readInput(request, 'reviewRelevance', 'review_relevance'),
    'reviewRelevance',
    issues
  )

  throwIfInvalid(issues)
  return {
    task_id: taskId as string,
    comment_id: commentId as string,
    ...(body !== undefined ? { body: body as string } : {}),
    ...(commentType !== undefined ? { comment_type: commentType } : {}),
    ...(visibility !== undefined ? { visibility } : {}),
    ...(reviewRelevance !== undefined ? { review_relevance: reviewRelevance } : {}),
  }
}

export function buildDeleteTaskCommentRequest(params: unknown): { comment_id: string } {
  const { commentId } = buildTaskCommentMutationRouteRequest(params)
  return { comment_id: commentId }
}
