import {
  asInput,
  buildTestingSeedRequest,
  buildTestingStringArrayInput,
  fail,
  readBoolean,
  readBoundedString,
  readOptionalString,
  readValueMap,
} from './testing_route_request_primitives.js'

import {
  validationIssue,
  type ValidationIssue,
} from '#modules/errors/public_contracts/validation_issue'

export type TestingAuditSurface = 'system' | 'organization' | 'user'

export interface TestingAuditScopeRequest {
  readonly surface: TestingAuditSurface
  readonly user_id: string | null
  readonly organization_id: string | null
}

export interface TestingAuditSeedRequest {
  readonly timestamp: number
  readonly nonce: string
  readonly seedKey: string
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

export const AUDIT_SURFACES = new Set<TestingAuditSurface>(['system', 'organization', 'user'])

export function readScopeArray(
  input: Record<string, unknown>,
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
