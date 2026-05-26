import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'

export interface IssueSessionTokenRequest {
  readonly organizationId: string | null
}

export interface RefreshSessionTokenRequest {
  readonly refreshToken: string
  readonly organizationId?: string
}

type SessionTokenRequest = Pick<HttpContext['request'], 'input'>

function requiredString(value: unknown, path: string, message: string, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(path, message, 'REQUEST_STRING_REQUIRED'))
    return undefined
  }

  return value.trim()
}

function optionalString(value: unknown, path: string, issues: ValidationIssue[]): string | undefined {
  if (value === undefined || value === null || value === '') return undefined

  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(path, `${path} must be a non-empty string`, 'REQUEST_STRING_INVALID'))
    return undefined
  }

  return value.trim()
}

function readFirstPresent(request: SessionTokenRequest, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value: unknown = request.input(key)
    if (value !== undefined && value !== null) return value
  }

  return undefined
}

export function buildIssueSessionTokenRequest(
  sessionOrganizationId: unknown,
  fallbackOrganizationId: unknown
): IssueSessionTokenRequest {
  const candidate = sessionOrganizationId ?? fallbackOrganizationId
  if (candidate === undefined || candidate === null) return { organizationId: null }

  const issues: ValidationIssue[] = []
  const organizationId = optionalString(candidate, 'organizationId', issues)
  if (issues.length > 0) throw ValidationException.fromIssues(issues)

  return { organizationId: organizationId ?? null }
}

export function buildRefreshSessionTokenRequest(
  request: SessionTokenRequest
): RefreshSessionTokenRequest {
  const issues: ValidationIssue[] = []
  const refreshToken = requiredString(
    readFirstPresent(request, ['refreshToken', 'refresh_token']),
    'refreshToken',
    'Refresh token is required',
    issues
  )
  const organizationId = optionalString(
    readFirstPresent(request, ['organizationId', 'organization_id']),
    'organizationId',
    issues
  )

  if (issues.length > 0) throw ValidationException.fromIssues(issues)

  return {
    refreshToken: refreshToken as string,
    ...(organizationId !== undefined ? { organizationId } : {}),
  }
}
