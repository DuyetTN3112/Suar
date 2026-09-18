import {
  TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS,
  TVA_CHANGE_CLASSES,
  TVA_PRIVACY_CLASSIFICATIONS,
  TVA_PROVENANCE_CLASSES,
  TVA_SCHEMA_VERSIONS,
  TVA_WORK_PACKAGE_STATES,
  type TvaJsonValue,
  type TvaSourceProvenanceV1,
} from './primitives.js'

import type {
  ProjectContextVersionV1,
  WorkPackageV1,
  WorkPackageVersionV1,
} from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'

export type UnknownRecord = Record<string, unknown>

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/
export const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/

export const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const hasOwn = (value: UnknownRecord, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key)

export const isString = (value: unknown): value is string => typeof value === 'string'
export const isNonEmptyString = (value: unknown): value is string =>
  isString(value) && value.trim().length > 0
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
export const isNullableString = (value: unknown): value is string | null =>
  value === null || isString(value)
export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
export const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && isFiniteNumber(value) && value > 0
export const isNonNegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && isFiniteNumber(value) && value >= 0
export const isNullableNonNegativeNumber = (value: unknown): value is number | null =>
  value === null || (isFiniteNumber(value) && value >= 0)
export const isNullableConfidence = (value: unknown): value is number | null =>
  value === null || (isFiniteNumber(value) && value >= 0 && value <= 1)

export const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  isString(value) && allowed.includes(value as T)

export const isUuid = (value: unknown): value is string => isString(value) && UUID_PATTERN.test(value)
export const isNullableUuid = (value: unknown): value is string | null => value === null || isUuid(value)
export const isIsoTimestamp = (value: unknown): value is string =>
  isString(value) && ISO_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value))
export const isNullableIsoTimestamp = (value: unknown): value is string | null =>
  value === null || isIsoTimestamp(value)
export const isSha256 = (value: unknown): value is `sha256:${string}` =>
  isString(value) && SHA256_PATTERN.test(value)
export const isNullableSha256 = (value: unknown): value is `sha256:${string}` | null =>
  value === null || isSha256(value)

export function isArrayOf<T>(
  value: unknown,
  guard: (entry: unknown) => entry is T
): value is readonly T[]
export function isArrayOf(value: unknown, guard: (entry: unknown) => boolean): value is readonly unknown[]
export function isArrayOf<T>(
  value: unknown,
  guard: (entry: unknown) => boolean
): value is readonly T[] {
  return Array.isArray(value) && value.every((entry) => guard(entry))
}

export const isStringArray = (value: unknown): value is readonly string[] => isArrayOf(value, isString)
export const isUuidArray = (value: unknown): value is readonly string[] => isArrayOf(value, isUuid)

export const hasUniqueStrings = (values: readonly string[]): boolean =>
  new Set(values).size === values.length

export const hasUniqueIds = (values: readonly { readonly id: string }[]): boolean =>
  hasUniqueStrings(values.map((value) => value.id))

export function isTvaJsonValue(value: unknown): value is TvaJsonValue {
  const seen = new WeakSet<object>()
  let nodes = 0

  const visit = (entry: unknown, depth: number): boolean => {
    nodes += 1
    if (
      nodes > TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS.maxJsonNodes ||
      depth > TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS.maxJsonDepth
    ) {
      return false
    }

    if (entry === null || typeof entry === 'boolean') {
      return true
    }
    if (typeof entry === 'string') {
      return entry.length <= TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS.maxStringLength
    }
    if (typeof entry === 'number') {
      return Number.isFinite(entry)
    }
    if (typeof entry !== 'object') {
      return false
    }
    if (seen.has(entry)) {
      return false
    }
    seen.add(entry)

    if (Array.isArray(entry)) {
      return entry.every((child) => visit(child, depth + 1))
    }
    if (
      Object.getPrototypeOf(entry) !== Object.prototype &&
      Object.getPrototypeOf(entry) !== null
    ) {
      return false
    }
    return Object.values(entry).every((child) => visit(child, depth + 1))
  }

  return visit(value, 0)
}

export const isJsonObject = (value: unknown): value is Record<string, TvaJsonValue> =>
  isRecord(value) && isTvaJsonValue(value)

export const hasSchemaVersion = (value: UnknownRecord, schemaVersion: string): boolean =>
  value['schemaVersion'] === schemaVersion

export const hasOptionalNullableString = (value: UnknownRecord, key: string): boolean =>
  !hasOwn(value, key) || isNullableString(value[key])

export const isSourceProvenanceV1 = (value: unknown): value is TvaSourceProvenanceV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isOneOf(value['class'], TVA_PROVENANCE_CLASSES) &&
    isOneOf(value['sourceType'], [
      'authored',
      'pasted',
      'uploaded',
      'authorized_import',
      'legacy',
    ] as const) &&
    isUuidArray(value['sourceReferenceIds']) &&
    hasUniqueStrings(value['sourceReferenceIds']) &&
    isNullableUuid(value['confirmedBy']) &&
    isNullableIsoTimestamp(value['confirmedAt'])
  )
}

export const isProjectContextVersionV1 = (value: unknown): value is ProjectContextVersionV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.projectContextVersion) &&
    isUuid(value['id']) &&
    isUuid(value['organizationId']) &&
    isUuid(value['projectId']) &&
    isPositiveInteger(value['versionNumber']) &&
    isNonEmptyString(value['title']) &&
    isString(value['summary']) &&
    isTvaJsonValue(value['richContent']) &&
    isString(value['plainTextProjection']) &&
    isJsonObject(value['structuredDefaults']) &&
    isIsoTimestamp(value['activeFrom']) &&
    isNullableIsoTimestamp(value['retiredAt']) &&
    isUuid(value['createdBy']) &&
    isNullableUuid(value['confirmedBy']) &&
    isOneOf(value['changeClass'], TVA_CHANGE_CLASSES) &&
    hasOptionalNullableString(value, 'changeReason') &&
    isOneOf(value['privacyClassification'], TVA_PRIVACY_CLASSIFICATIONS) &&
    isSha256(value['contentHash']) &&
    isSourceProvenanceV1(value['sourceProvenance']) &&
    isIsoTimestamp(value['createdAt'])
  )
}

export const isWorkPackageV1 = (value: unknown): value is WorkPackageV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.workPackage) &&
    isUuid(value['id']) &&
    isUuid(value['organizationId']) &&
    isUuid(value['projectId']) &&
    isNonEmptyString(value['key']) &&
    isNonEmptyString(value['title']) &&
    isString(value['summary']) &&
    isOneOf(value['state'], TVA_WORK_PACKAGE_STATES) &&
    isNullableUuid(value['activeVersionId']) &&
    isUuid(value['createdBy']) &&
    isIsoTimestamp(value['createdAt']) &&
    isNullableIsoTimestamp(value['archivedAt'])
  )
}

export const isWorkPackageVersionV1 = (value: unknown): value is WorkPackageVersionV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.workPackageVersion) &&
    isUuid(value['id']) &&
    isUuid(value['workPackageId']) &&
    isUuid(value['projectId']) &&
    isNullableUuid(value['projectContextVersionId']) &&
    isPositiveInteger(value['versionNumber']) &&
    isNonEmptyString(value['title']) &&
    isString(value['summary']) &&
    isTvaJsonValue(value['richContent']) &&
    isString(value['plainTextProjection']) &&
    isJsonObject(value['structuredOverrides']) &&
    isUuid(value['authorId']) &&
    isNullableUuid(value['confirmedBy']) &&
    isOneOf(value['changeClass'], TVA_CHANGE_CLASSES) &&
    hasOptionalNullableString(value, 'changeReason') &&
    isOneOf(value['privacyClassification'], TVA_PRIVACY_CLASSIFICATIONS) &&
    isSha256(value['contentHash']) &&
    isSourceProvenanceV1(value['sourceProvenance']) &&
    isIsoTimestamp(value['createdAt'])
  )
}
