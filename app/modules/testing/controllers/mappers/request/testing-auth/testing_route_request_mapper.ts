import {
  asInput,
  CLEANUP_TOKEN_PATTERN,
  fail,
  readBoolean,
  readEnum,
  readNumber,
  readString,
} from './testing_route_request_primitives.js'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  validationIssue,
  type ValidationIssue,
} from '#modules/errors/public_contracts/validation_issue'

// Re-export types and builders for 100% backward compatibility
export type {
  TestingAuditScopeRequest,
  TestingAuditSeedRequest,
  TestingAuditSurface,
} from './testing_audit_seed_request_mapper.js'
export {
  buildTestingAuditScopeArrayInput,
  buildTestingAuditSeedRequest,
} from './testing_audit_seed_request_mapper.js'

export type {
  TestingRouteInput,
  TestingSeedRequest,
} from './testing_route_request_primitives.js'
export {
  buildTestingSeedRequest,
  buildTestingStringArrayInput,
} from './testing_route_request_primitives.js'

export function buildTestingCleanupRequest(payload: unknown): string[] {
  const input = asInput(payload)
  const rawTokens = input['tokens']
  const values = rawTokens === undefined ? [input['timestamp'] ?? input['seedKey']] : rawTokens
  const tokens: unknown[] = Array.isArray(values) ? (values as unknown[]) : [values]
  if (tokens.length > 32) {
    throw ValidationException.field('tokens', 'At most 32 cleanup tokens are allowed')
  }
  const normalized = tokens.map((value, index) => {
    const token = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
    if (
      typeof token !== 'string' ||
      token.length > 128 ||
      !CLEANUP_TOKEN_PATTERN.test(token.trim())
    ) {
      throw ValidationException.field(`tokens.${index}`, 'Cleanup token format is invalid')
    }
    return token.trim()
  })
  const uniqueTokens = [...new Set(normalized)]
  if (uniqueTokens.length === 0) {
    throw ValidationException.fromIssues([
      validationIssue('body', 'A seed cleanup token is required', 'TESTING_CLEANUP_TOKEN_REQUIRED'),
    ])
  }
  return uniqueTokens
}

export function buildTestingBooleanInput(
  payload: unknown,
  key: string,
  fallback: boolean
): boolean {
  const issues: ValidationIssue[] = []
  const value = readBoolean(asInput(payload), key, fallback, issues)
  if (issues.length > 0) fail(issues)
  return value
}

export function buildTestingRequiredStringInput(payload: unknown, key: string): string {
  const issues: ValidationIssue[] = []
  const value = readString(asInput(payload), key, undefined, issues)
  if (issues.length > 0) fail(issues)
  return value
}

export function buildTestingEnumInput<T extends string>(
  payload: unknown,
  key: string,
  fallback: T,
  allowed: readonly T[]
): T {
  const issues: ValidationIssue[] = []
  const value = readEnum(asInput(payload), key, fallback, allowed, issues)
  if (issues.length > 0) fail(issues)
  return value
}

export function buildTestingPeerCountInput(payload: unknown, fallback = 1): number {
  const issues: ValidationIssue[] = []
  const requested = readNumber(asInput(payload), 'peerCount', fallback, issues, { integer: true })
  if (requested < 1 || requested > 2) {
    issues.push(
      validationIssue(
        'peerCount',
        'peerCount must be between 1 and 2',
        'TESTING_NUMBER_OUT_OF_RANGE'
      )
    )
  }
  if (issues.length > 0) fail(issues)
  return requested
}

export function buildTestingSearchTaskCountInput(payload: unknown, fallback = 1): number {
  const issues: ValidationIssue[] = []
  const requested = readNumber(asInput(payload), 'searchTaskCount', fallback, issues, {
    integer: true,
    min: 1,
    max: 32,
  })
  if (issues.length > 0) fail(issues)
  return requested
}

export function buildTestingOptionalStringInput(
  payload: unknown,
  key: string,
  options: { maxLength?: number } = {}
): string | null {
  const input = asInput(payload)
  const value = input[key]
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    throw ValidationException.fromIssues([
      validationIssue(key, `${key} must be a string or null`, 'TESTING_STRING_INVALID'),
    ])
  }
  const normalized = value.trim()
  if (normalized.length === 0) return null
  if (options.maxLength !== undefined && normalized.length > options.maxLength) {
    throw ValidationException.fromIssues([
      validationIssue(
        key,
        `${key} must be at most ${options.maxLength} characters`,
        'TESTING_STRING_TOO_LONG'
      ),
    ])
  }
  return normalized
}

export function buildTestingCacheStatusRequest(payload: unknown): {
  readonly taskId: string
  readonly operation: 'INSERT' | 'UPDATE'
} {
  const input = asInput(payload)
  const issues: ValidationIssue[] = []
  const taskId = readString(input, 'taskId', undefined, issues)
  const operation = readEnum(input, 'operation', 'UPDATE', ['INSERT', 'UPDATE'] as const, issues)
  if (issues.length > 0) fail(issues)
  return { taskId, operation }
}
