import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'

type BookmarkRequest = HttpContext['request']

function readInput(request: BookmarkRequest, ...keys: string[]): unknown {
  for (const key of keys) {
    const value: unknown = request.input(key) as unknown
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function requiredString(value: unknown, path: string, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(path, `${path} is required`, 'REQUEST_STRING_REQUIRED'))
    return undefined
  }
  return value.trim()
}

function optionalString(value: unknown, path: string, issues: ValidationIssue[]): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    issues.push(validationIssue(path, `${path} must be a string`, 'REQUEST_STRING_REQUIRED'))
    return undefined
  }
  return value.trim()
}

function optionalRating(value: unknown, issues: ValidationIssue[]): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const rating =
    typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    issues.push(validationIssue('rating', 'rating must be a number between 1 and 5', 'REQUEST_NUMBER_RANGE'))
    return undefined
  }
  return rating
}

export function buildRecruiterBookmarkCreateRequest(
  request: BookmarkRequest,
  params: unknown
): { talent_user_id: string; notes?: string; folder?: string; rating?: number } {
  const routeUserId =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)['userId']
      : undefined
  const issues: ValidationIssue[] = []
  const talentUserId = requiredString(
    routeUserId ?? readInput(request, 'talentUserId', 'talent_user_id'),
    'talentUserId',
    issues
  )
  const notes = optionalString(readInput(request, 'notes'), 'notes', issues)
  const folder = optionalString(readInput(request, 'folder'), 'folder', issues)
  const rating = optionalRating(readInput(request, 'rating'), issues)
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return { talent_user_id: talentUserId as string, ...(notes !== undefined ? { notes } : {}), ...(folder !== undefined ? { folder } : {}), ...(rating !== undefined ? { rating } : {}) }
}

export function buildRecruiterBookmarkUpdateRequest(
  request: BookmarkRequest,
  params: unknown
): { id: string; notes?: string; folder?: string; rating?: number } {
  const bookmarkId =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)['bookmarkId']
      : undefined
  const issues: ValidationIssue[] = []
  const id = requiredString(bookmarkId, 'bookmarkId', issues)
  const notes = optionalString(readInput(request, 'notes'), 'notes', issues)
  const folder = optionalString(readInput(request, 'folder'), 'folder', issues)
  const rating = optionalRating(readInput(request, 'rating'), issues)
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return { id: id as string, ...(notes !== undefined ? { notes } : {}), ...(folder !== undefined ? { folder } : {}), ...(rating !== undefined ? { rating } : {}) }
}

export function buildRecruiterBookmarkRouteRequest(
  params: unknown,
  name: 'bookmarkId'
): { readonly bookmarkId: string }
export function buildRecruiterBookmarkRouteRequest(
  params: unknown,
  name: 'userId'
): { readonly userId: string }
export function buildRecruiterBookmarkRouteRequest(
  params: unknown,
  name: 'bookmarkId' | 'userId'
): { readonly [key: string]: string } {
  const value =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)[name]
      : undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue(name, `${name} is required`, 'ROUTE_PARAMETER_REQUIRED'),
    ])
  }
  return { [name]: value.trim() }
}
