import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'
import {
  asJsonRecord,
  asRecord,
  readCriteria,
  readInterval,
  readNullableString,
  readOptionalString,
  readPositiveInt,
  readString,
  readTimezone,
  readVisibility,
  semanticFromCriteria,
} from '#modules/filtering/controllers/saved-filter-views/filter_saved_views_http_helpers'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


export interface FilterSavedViewGrantInput {
  readonly target: { readonly type: 'user' | 'organization' | 'team'; readonly id: string }
  readonly read: boolean
  readonly edit: boolean
  readonly share: boolean
  readonly subscribe: boolean
}

const GRANT_TARGET_TYPES = new Set(['user', 'organization', 'team'])
const ALERT_ACTIONS = new Set(['pause', 'resume', 'schedule', 'delete'])

export function buildListSavedFilterViewsRequest(payload: unknown) {
  const body = payload === undefined ? {} : asRecord(payload)
  const context = body['context']
  if (context !== undefined && typeof context !== 'string') {
    throw ValidationException.field('context', 'Context must be a string.')
  }
  // The action contract requires a concrete context. An omitted context must
  // fail closed rather than becoming an accidental cross-context listing.
  return { context: typeof context === 'string' && context.trim() ? context.trim() : '' }
}

export function buildSavedFilterViewRouteRequest(payload: unknown) {
  return { viewId: readString(asRecord(payload)['viewId']) }
}

function optionalBoolean(value: unknown, path: string, issues: ValidationIssue[]): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    issues.push(validationIssue(path, `${path} must be a boolean`, 'REQUEST_BOOLEAN_INVALID'))
    return undefined
  }
  return value
}

function readGrants(value: unknown): readonly FilterSavedViewGrantInput[] {
  if (!Array.isArray(value)) {
    throw ValidationException.fromIssues([
      validationIssue('grants', 'grants must be an array', 'REQUEST_ARRAY_REQUIRED'),
    ])
  }
  const issues: ValidationIssue[] = []
  const grants = value.map((entry, index) => {
    const grant = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry as Record<string, unknown> : {}
    const target = grant['target'] && typeof grant['target'] === 'object' && !Array.isArray(grant['target'])
      ? grant['target'] as Record<string, unknown>
      : {}
    const targetType = target['type']
    if (typeof targetType !== 'string' || !GRANT_TARGET_TYPES.has(targetType)) {
      issues.push(validationIssue(`grants.${index}.target.type`, 'Grant target type is invalid', 'GRANT_TARGET_TYPE_INVALID'))
    }
    if (typeof target['id'] !== 'string' || target['id'].trim().length === 0) {
      issues.push(validationIssue(`grants.${index}.target.id`, 'Grant target id is required', 'GRANT_TARGET_ID_REQUIRED'))
    }
    const flags = {
      read: optionalBoolean(grant['read'], `grants.${index}.read`, issues),
      edit: optionalBoolean(grant['edit'], `grants.${index}.edit`, issues),
      share: optionalBoolean(grant['share'], `grants.${index}.share`, issues),
      subscribe: optionalBoolean(grant['subscribe'], `grants.${index}.subscribe`, issues),
    }
    return {
      target: {
        type: targetType as FilterSavedViewGrantInput['target']['type'],
        id: typeof target['id'] === 'string' ? target['id'].trim() : '',
      },
      read: flags.read ?? false,
      edit: flags.edit ?? false,
      share: flags.share ?? false,
      subscribe: flags.subscribe ?? false,
    }
  })
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return grants
}

export function buildCreateSavedFilterViewRequest(payload: unknown) {
  const body = asRecord(payload)
  const criteria = readCriteria(body['criteria'])
  return {
    name: readString(body['name']),
    description: body['description'] === null ? null : (readOptionalString(body['description']) ?? null),
    visibility: readVisibility(body['visibility'] ?? 'private'),
    organizationId: readNullableString(body['organizationId']),
    teamId: readNullableString(body['teamId']),
    contextKey: readString(body['contextKey']),
    contextOwner: readString(body['contextOwner']),
    schemaVersion: criteria.schemaVersion,
    semanticState: semanticFromCriteria(criteria),
    presentationState: asJsonRecord(body['presentation']),
    isDefault: body['isDefault'] === true,
    isPinned: body['isPinned'] === true,
  }
}

export function buildUpdateSavedFilterViewRequest(payload: unknown) {
  const body = asRecord(payload)
  const criteria = body['criteria'] === undefined ? undefined : readCriteria(body['criteria'])
  return {
    expectedLockVersion: readPositiveInt(body['expectedLockVersion']),
    patch: omitUndefined({
      ...(body['name'] === undefined ? {} : { name: readString(body['name']) }),
      ...(body['description'] === undefined ? {} : { description: body['description'] === null ? null : readString(body['description']) }),
      ...(criteria === undefined ? {} : { semanticState: semanticFromCriteria(criteria) }),
      ...(body['presentation'] === undefined ? {} : { presentationState: asJsonRecord(body['presentation']) }),
      ...(body['isDefault'] === undefined ? {} : { isDefault: body['isDefault'] === true }),
      ...(body['isPinned'] === undefined ? {} : { isPinned: body['isPinned'] === true }),
      ...(body['repair'] === true ? { repair: true } : {}),
    }),
  }
}

export function buildDeleteSavedFilterViewRequest(payload: unknown) {
  return { expectedLockVersion: readPositiveInt(asRecord(payload)['expectedLockVersion']) }
}

export function buildDuplicateSavedFilterViewRequest(payload: unknown) {
  return { name: readString(asRecord(payload)['name']) }
}

export function buildShareSavedFilterViewRequest(payload: unknown) {
  const body = asRecord(payload)
  const grants = readGrants(body['grants'])
  return {
    expectedLockVersion: readPositiveInt(body['expectedLockVersion']),
    visibility: readVisibility(body['visibility']),
    organizationId: readNullableString(body['organizationId']),
    teamId: readNullableString(body['teamId']),
    grants,
  }
}

export function buildUpdateFilterAlertRequest(payload: unknown) {
  const body = asRecord(payload)
  const action = body['action']
  if (typeof action !== 'string' || !ALERT_ACTIONS.has(action)) {
    throw ValidationException.field('action', 'Alert action is invalid.')
  }
  return {
    expectedLockVersion: readPositiveInt(body['expectedLockVersion']),
    action: action as 'pause' | 'resume' | 'schedule' | 'delete',
    ...(action === 'schedule'
      ? { intervalMinutes: readInterval(body['intervalMinutes']), timezone: readTimezone(body['timezone']) }
      : {}),
  }
}

export function buildCreateFilterAlertRequest(payload: unknown) {
  const body = asRecord(payload)
  return {
    intervalMinutes: readInterval(body['intervalMinutes']),
    timezone: readTimezone(body['timezone']),
  }
}
