import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  validationIssue,
  type ValidationIssue,
} from '#modules/errors/public_contracts/validation_issue'

export type TestingRouteInput = Record<string, unknown>

export interface TestingSeedRequest {
  readonly timestamp: number
  readonly nonce: string
  readonly seedKey: string
}

export const CLEANUP_TOKEN_PATTERN =
  /^(?:\d{10,}(?:[-.][a-z0-9_-]+)?|(?:seed|e2e)[a-z0-9_.@-]*|[a-z0-9_.-]+@test\.com)$/i

export function asInput(value: unknown): TestingRouteInput {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as TestingRouteInput
  }
  throw ValidationException.fromIssues([
    validationIssue('body', 'Request body must be an object', 'TESTING_OBJECT_REQUIRED'),
  ])
}

export function fail(issues: ValidationIssue[]): never {
  throw ValidationException.fromIssues(issues)
}

export function readString(
  input: TestingRouteInput,
  key: string,
  fallback: string | undefined,
  issues: ValidationIssue[]
): string {
  const value = input[key]
  if (value === undefined && fallback !== undefined) return fallback
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(key, `${key} must be a non-empty string`, 'TESTING_STRING_INVALID'))
    return ''
  }
  return value.trim()
}

export function readBoundedString(
  input: TestingRouteInput,
  key: string,
  fallback: string | undefined,
  issues: ValidationIssue[],
  maxLength: number
): string {
  const value = readString(input, key, fallback, issues)
  if (value.length > maxLength) {
    issues.push(
      validationIssue(
        key,
        `${key} must be at most ${maxLength} characters`,
        'TESTING_STRING_TOO_LONG'
      )
    )
  }
  return value
}

export function readOptionalString(
  input: TestingRouteInput,
  key: string,
  fallback: string | null,
  issues: ValidationIssue[]
): string | null {
  const value = input[key]
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'string') {
    issues.push(validationIssue(key, `${key} must be a string or null`, 'TESTING_STRING_INVALID'))
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export function readBoolean(
  input: TestingRouteInput,
  key: string,
  fallback: boolean,
  issues: ValidationIssue[]
): boolean {
  const value = input[key]
  if (value === undefined) return fallback
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  issues.push(validationIssue(key, `${key} must be a boolean`, 'TESTING_BOOLEAN_INVALID'))
  return fallback
}

export function readNumber(
  input: TestingRouteInput,
  key: string,
  fallback: number,
  issues: ValidationIssue[],
  options: { integer?: boolean; min?: number; max?: number } = {}
): number {
  const value = input[key]
  if (value === undefined) return fallback
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : Number.NaN
  const valid =
    Number.isFinite(numeric) &&
    (options.integer !== true || Number.isSafeInteger(numeric)) &&
    (options.min === undefined || numeric >= options.min) &&
    (options.max === undefined || numeric <= options.max)
  if (!valid) {
    issues.push(validationIssue(key, `${key} must be a valid number`, 'TESTING_NUMBER_INVALID'))
    return fallback
  }
  return numeric
}

export function readEnum<T extends string>(
  input: TestingRouteInput,
  key: string,
  fallback: T,
  allowed: readonly T[],
  issues: ValidationIssue[]
): T {
  const value = input[key]
  if (value === undefined) return fallback
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  issues.push(
    validationIssue(key, `${key} must be one of: ${allowed.join(', ')}`, 'TESTING_ENUM_INVALID')
  )
  return fallback
}

export function readValueMap(
  input: TestingRouteInput,
  key: string,
  fallback: Record<string, unknown>,
  issues: ValidationIssue[]
): Record<string, unknown> {
  const value = input[key]
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'object' || Array.isArray(value)) {
    issues.push(validationIssue(key, `${key} must be an object`, 'TESTING_OBJECT_INVALID'))
    return fallback
  }
  return value as Record<string, unknown>
}

export function buildTestingSeedRequest(
  payload: unknown,
  defaults: { timestamp: number; nonce: string }
): TestingSeedRequest {
  const input = asInput(payload)
  const issues: ValidationIssue[] = []
  const timestamp = readNumber(input, 'timestamp', defaults.timestamp, issues, {
    integer: true,
    min: 1,
  })
  const nonce = readString(input, 'nonce', defaults.nonce, issues)
  if (nonce.length > 64) {
    issues.push(
      validationIssue('nonce', 'nonce must be at most 64 characters', 'TESTING_STRING_TOO_LONG')
    )
  }
  if (issues.length > 0) fail(issues)
  return { timestamp, nonce, seedKey: `${timestamp}-${nonce}` }
}

export function buildTestingStringArrayInput(
  payload: unknown,
  key: string,
  options: { minLength?: number; maxLength?: number; itemMaxLength?: number } = {}
): string[] {
  const input = asInput(payload)
  const value = input[key]
  const issues: ValidationIssue[] = []
  if (!Array.isArray(value)) {
    issues.push(validationIssue(key, `${key} must be an array`, 'TESTING_ARRAY_INVALID'))
  } else {
    const values = value.map((entry, index) => {
      if (typeof entry !== 'string' || entry.trim().length === 0) {
        issues.push(
          validationIssue(
            `${key}[${index}]`,
            'array entries must be non-empty strings',
            'TESTING_STRING_INVALID'
          )
        )
        return ''
      }
      const normalized = entry.trim()
      if (options.itemMaxLength !== undefined && normalized.length > options.itemMaxLength) {
        issues.push(
          validationIssue(
            `${key}[${index}]`,
            `array entries must be at most ${options.itemMaxLength} characters`,
            'TESTING_STRING_TOO_LONG'
          )
        )
        return ''
      }
      return normalized
    })
    const unique = [...new Set(values.filter(Boolean))]
    if (options.minLength !== undefined && unique.length < options.minLength) {
      issues.push(
        validationIssue(
          key,
          `${key} must contain at least ${options.minLength} identifier`,
          'TESTING_ARRAY_EMPTY'
        )
      )
    }
    if (options.maxLength !== undefined && unique.length > options.maxLength) {
      issues.push(
        validationIssue(
          key,
          `${key} must contain at most ${options.maxLength} identifiers`,
          'TESTING_ARRAY_TOO_LARGE'
        )
      )
    }
    if (issues.length === 0) return unique
  }
  fail(issues)
}
