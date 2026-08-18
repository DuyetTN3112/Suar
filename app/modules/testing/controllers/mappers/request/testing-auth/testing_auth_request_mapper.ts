import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'
import type { EnsureTestingAuthFixtureInput } from '#modules/testing/actions/commands/testing-auth/ensure_testing_auth_fixture_command'

type Input = Record<string, unknown>
const ROLES = new Set(['registered_user', 'system_admin', 'superadmin'])
const PROVIDERS = new Set(['google', 'github'])
const MAX_TOKEN_LENGTH = 4096

function record(value: unknown): Input {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.field('body', 'Request body must be an object')
  }
  return value as Input
}

function first(input: Input, keys: readonly string[], issues: ValidationIssue[]): unknown {
  const present = keys.filter((key) => Object.prototype.hasOwnProperty.call(input, key))
  if (present.length > 1) {
    issues.push(validationIssue(keys[0] ?? 'request', `Use only one of: ${keys.join(', ')}`, 'REQUEST_ALIAS_CONFLICT'))
  }
  const firstKey = present[0]
  return firstKey === undefined ? undefined : input[firstKey]
}

function optionalString(
  input: Input,
  keys: readonly string[],
  path: string,
  issues: ValidationIssue[],
  maxLength = 255
): string | undefined {
  const value = first(input, keys, issues)
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(path, `${path} must be a non-empty string`, 'REQUEST_STRING_INVALID'))
    return undefined
  }
  const normalized = value.trim()
  if (normalized.length > maxLength) {
    issues.push(validationIssue(path, `${path} is too long`, 'REQUEST_STRING_TOO_LONG'))
    return undefined
  }
  return normalized
}

function requiredEmail(input: Input, issues: ValidationIssue[]): string {
  const email = optionalString(input, ['email'], 'email', issues)
  if (!email) return ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push(validationIssue('email', 'email format is invalid', 'REQUEST_EMAIL_INVALID'))
  }
  return email
}

function fixtureRequest(payload: unknown): EnsureTestingAuthFixtureInput {
  const input = record(payload)
  const issues: ValidationIssue[] = []
  const email = requiredEmail(input, issues)
  const provider = optionalString(input, ['provider'], 'provider', issues)
  const requestedOrganizationId = optionalString(
    input,
    ['organizationId', 'organization_id'],
    'organizationId',
    issues
  )
  const requestedSystemRole = optionalString(
    input,
    ['systemRole', 'system_role'],
    'systemRole',
    issues
  )
  if (provider !== undefined && !PROVIDERS.has(provider)) {
    issues.push(validationIssue('provider', 'provider must be google or github', 'REQUEST_ENUM_INVALID'))
  }
  if (requestedSystemRole !== undefined && !ROLES.has(requestedSystemRole)) {
    issues.push(validationIssue('systemRole', 'systemRole is invalid', 'REQUEST_ENUM_INVALID'))
  }
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return {
    email,
    ...(provider === undefined ? {} : { provider: provider as 'google' | 'github' }),
    ...(requestedOrganizationId === undefined ? {} : { requestedOrganizationId }),
    ...(requestedSystemRole === undefined ? {} : { requestedSystemRole }),
  }
}

export function buildTestingAuthFixtureRequest(payload: unknown): EnsureTestingAuthFixtureInput {
  return fixtureRequest(payload)
}

export function buildTestingRefreshRequest(payload: unknown): {
  refreshToken: string
  requestedOrganizationId?: string
} {
  const input = record(payload)
  const issues: ValidationIssue[] = []
  const refreshToken = optionalString(
    input,
    ['refreshToken', 'refresh_token'],
    'refreshToken',
    issues,
    MAX_TOKEN_LENGTH
  )
  const requestedOrganizationId = optionalString(
    input,
    ['organizationId', 'organization_id'],
    'organizationId',
    issues
  )
  if (!refreshToken) issues.push(validationIssue('refreshToken', 'refreshToken is required', 'REQUEST_REQUIRED'))
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return { refreshToken: refreshToken as string, ...(requestedOrganizationId ? { requestedOrganizationId } : {}) }
}

export function buildTestingBootstrapRequest(payload: unknown, authorizationHeader: unknown): string {
  const input = record(payload)
  const issues: ValidationIssue[] = []
  let token: unknown
  if (authorizationHeader !== undefined && authorizationHeader !== null) {
    if (typeof authorizationHeader !== 'string') {
      issues.push(validationIssue('authorization', 'authorization must be a string', 'REQUEST_STRING_INVALID'))
    } else if (authorizationHeader.startsWith('Bearer ')) {
      token = authorizationHeader.slice('Bearer '.length).trim()
    }
  }
  if (token === undefined) token = first(input, ['accessToken', 'access_token'], issues)
  if (typeof token !== 'string' || token.trim().length === 0) {
    issues.push(validationIssue('accessToken', 'Access token is required', 'REQUEST_REQUIRED'))
  } else if (token.length > MAX_TOKEN_LENGTH) {
    issues.push(validationIssue('accessToken', 'accessToken is too long', 'REQUEST_STRING_TOO_LONG'))
  }
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return (token as string).trim()
}
