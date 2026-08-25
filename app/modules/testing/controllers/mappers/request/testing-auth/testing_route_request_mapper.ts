import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  validationIssue,
  type ValidationIssue,
} from '#modules/errors/public_contracts/validation_issue'

export type TestingRouteInput = Record<string, unknown>
export type TestingAuditSurface = 'system' | 'organization' | 'user'

export interface TestingSeedRequest {
  readonly timestamp: number
  readonly nonce: string
  readonly seedKey: string
}

export interface TestingAuditScopeRequest {
  readonly surface: TestingAuditSurface
  readonly user_id: string | null
  readonly organization_id: string | null
}

export interface TestingAuditSeedRequest extends TestingSeedRequest {
  readonly action: string
  readonly entityType: string
  readonly enterprise: boolean
  readonly userEmail: string | null
  readonly userScopeId: string | null
  readonly entityId: string | null
  readonly actorUserId: string | null
  readonly organizationScopeId: string | null
  readonly actorOrganizationId: string | null
  readonly targetOrganizationId: string | null
  readonly oldValues: Record<string, unknown>
  readonly newValues: Record<string, unknown>
  readonly eventName: string | null
  readonly eventFamily: string | null
  readonly module: string | null
  readonly subsystem: string | null
  readonly workflow: string | null
  readonly stage: string | null
  readonly severity: string | null
  readonly outcome: string | null
  readonly actorType: string | null
  readonly actorRoleSurface: string | null
  readonly targetType: string | null
  readonly targetId: string | null
  readonly requestId: string | null
  readonly traceId: string | null
  readonly correlationKey: string | null
  readonly retentionClass: string | null
  readonly redactionApplied: boolean
  readonly scopes: TestingAuditScopeRequest[]
}

const AUDIT_SURFACES = new Set<TestingAuditSurface>(['system', 'organization', 'user'])

function asInput(value: unknown): TestingRouteInput {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as TestingRouteInput
  }
  throw ValidationException.fromIssues([
    validationIssue('body', 'Request body must be an object', 'TESTING_OBJECT_REQUIRED'),
  ])
}

function fail(issues: ValidationIssue[]): never {
  throw ValidationException.fromIssues(issues)
}

function readString(
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

function readBoundedString(
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

function readOptionalString(
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

function readBoolean(
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

function readNumber(
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

function readEnum<T extends string>(
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

function readValueMap(
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

function readScopeArray(
  input: TestingRouteInput,
  issues: ValidationIssue[]
): TestingAuditScopeRequest[] {
  const value = input['scopes']
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    issues.push(validationIssue('scopes', 'scopes must be an array', 'TESTING_ARRAY_INVALID'))
    return []
  }
  if (value.length > 32) {
    issues.push(
      validationIssue('scopes', 'scopes must contain at most 32 entries', 'TESTING_ARRAY_TOO_LARGE')
    )
    return []
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      issues.push(
        validationIssue(`scopes[${index}]`, 'scope must be an object', 'TESTING_OBJECT_INVALID')
      )
      return { surface: 'system', user_id: null, organization_id: null }
    }
    const scope = entry as Record<string, unknown>
    const surface = scope['surface']
    if (typeof surface !== 'string' || !AUDIT_SURFACES.has(surface as TestingAuditSurface)) {
      issues.push(
        validationIssue(
          `scopes[${index}].surface`,
          'surface must be system, organization, or user',
          'TESTING_ENUM_INVALID'
        )
      )
    }
    const userValue = scope['user_id'] ?? scope['userId']
    const organizationValue = scope['organization_id'] ?? scope['organizationId']
    const userId =
      userValue === undefined || userValue === null
        ? null
        : typeof userValue === 'string'
          ? userValue.trim()
          : null
    const organizationId =
      organizationValue === undefined || organizationValue === null
        ? null
        : typeof organizationValue === 'string'
          ? organizationValue.trim()
          : null
    if (userValue !== undefined && userValue !== null && userId === null) {
      issues.push(
        validationIssue(
          `scopes[${index}].user_id`,
          'user_id must be a string or null',
          'TESTING_STRING_INVALID'
        )
      )
    }
    if (organizationValue !== undefined && organizationValue !== null && organizationId === null) {
      issues.push(
        validationIssue(
          `scopes[${index}].organization_id`,
          'organization_id must be a string or null',
          'TESTING_STRING_INVALID'
        )
      )
    }
    if (userId !== null && userId.length > 128) {
      issues.push(
        validationIssue(
          `scopes[${index}].user_id`,
          'user_id must be at most 128 characters',
          'TESTING_STRING_TOO_LONG'
        )
      )
    }
    if (organizationId !== null && organizationId.length > 128) {
      issues.push(
        validationIssue(
          `scopes[${index}].organization_id`,
          'organization_id must be at most 128 characters',
          'TESTING_STRING_TOO_LONG'
        )
      )
    }
    return {
      surface: AUDIT_SURFACES.has(surface as TestingAuditSurface)
        ? (surface as TestingAuditSurface)
        : 'system',
      user_id: userId,
      organization_id: organizationId,
    }
  })
}

const CLEANUP_TOKEN_PATTERN =
  /^(?:\d{10,}(?:[-.][a-z0-9_-]+)?|(?:seed|e2e)[a-z0-9_.@-]*|[a-z0-9_.-]+@test\.com)$/i

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

export function buildTestingAuditSeedRequest(
  payload: unknown,
  defaults: { timestamp: number; nonce: string }
): TestingAuditSeedRequest {
  const input = asInput(payload)
  const seed = buildTestingSeedRequest(input, defaults)
  const issues: ValidationIssue[] = []
  const action = readBoundedString(
    input,
    'action',
    `e2e.audit_console.seeded.${seed.seedKey}`,
    issues,
    255
  )
  const entityType = readBoundedString(input, 'entityType', 'task', issues, 128)
  const enterprise = readBoolean(input, 'enterprise', false, issues)
  const scopes = readScopeArray(input, issues)
  const userScopeId = readOptionalString(input, 'userScopeId', null, issues)
  const targetOrganizationId =
    readOptionalString(input, 'targetOrganizationId', null, issues) ??
    readOptionalString(input, 'organizationId', null, issues)
  const organizationScopeId =
    readOptionalString(input, 'organizationScopeId', null, issues) ?? targetOrganizationId
  const actorUserId =
    readOptionalString(input, 'actorUserId', null, issues) ??
    readOptionalString(input, 'userId', null, issues)
  const result: TestingAuditSeedRequest = {
    ...seed,
    action,
    entityType,
    enterprise,
    userEmail: readOptionalString(input, 'userEmail', null, issues),
    userScopeId,
    entityId: readOptionalString(input, 'entityId', null, issues),
    actorUserId,
    organizationScopeId,
    actorOrganizationId: readOptionalString(input, 'actorOrganizationId', null, issues),
    targetOrganizationId,
    oldValues: readValueMap(
      input,
      'oldValues',
      { status: 'queued', source: 'playwright-seed' },
      issues
    ),
    newValues: readValueMap(
      input,
      'newValues',
      { status: 'reviewed', source: 'playwright-seed' },
      issues
    ),
    eventName: readOptionalString(input, 'eventName', null, issues),
    eventFamily: readOptionalString(input, 'eventFamily', null, issues),
    module: readOptionalString(input, 'module', null, issues),
    subsystem: readOptionalString(input, 'subsystem', null, issues),
    workflow: readOptionalString(input, 'workflow', null, issues),
    stage: readOptionalString(input, 'stage', null, issues),
    severity: readOptionalString(input, 'severity', null, issues),
    outcome: readOptionalString(input, 'outcome', null, issues),
    actorType: readOptionalString(input, 'actorType', null, issues),
    actorRoleSurface: readOptionalString(input, 'actorRoleSurface', null, issues),
    targetType: readOptionalString(input, 'targetType', null, issues),
    targetId: readOptionalString(input, 'targetId', null, issues),
    requestId: readOptionalString(input, 'requestId', null, issues),
    traceId: readOptionalString(input, 'traceId', null, issues),
    correlationKey: readOptionalString(input, 'correlationKey', null, issues),
    retentionClass: readOptionalString(input, 'retentionClass', null, issues),
    redactionApplied: readBoolean(input, 'redactionApplied', true, issues),
    scopes,
  }
  if (issues.length > 0) fail(issues)
  return result
}

export function buildTestingAuditScopeArrayInput(payload: unknown): string[] {
  return buildTestingStringArrayInput(payload, 'scopeIds', { minLength: 1, maxLength: 32 })
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
