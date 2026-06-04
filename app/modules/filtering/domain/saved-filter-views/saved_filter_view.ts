// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
import { canonicalizeFilterExpression } from '#modules/filtering/domain/filtering-core/filter_canonicalizer'
import {
  DEFAULT_FILTER_VALIDATION_LIMITS,
  validateFilterExpression,
} from '#modules/filtering/domain/filtering-core/filter_validator'
const DEFAULT_MAX_SAVED_FILTER_CANONICAL_PAYLOAD_BYTES = 65536
const MAX_SAVED_FILTER_SORT_FIELDS = 100
const MAX_SAVED_FILTER_PROJECTION_FIELDS = 100
const MAX_SAVED_FILTER_JSON_DEPTH = 32
const MAX_SAVED_FILTER_JSON_NODES = 1e4
class SavedFilterViewInvariantError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
  code
  static {
    __name(this, 'SavedFilterViewInvariantError')
  }
  name = 'SavedFilterViewInvariantError'
}
function invariant(condition, code) {
  if (!condition) {
    throw new SavedFilterViewInvariantError(code)
  }
}
__name(invariant, 'invariant')
function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const record = value
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}
__name(stableJson, 'stableJson')
function assertJsonValue(value, seen, depth = 0, budget = { nodes: 0 }) {
  if (depth > MAX_SAVED_FILTER_JSON_DEPTH) {
    throw new SavedFilterViewInvariantError('presentation_depth_exceeded')
  }
  budget.nodes += 1
  if (budget.nodes > MAX_SAVED_FILTER_JSON_NODES) {
    throw new SavedFilterViewInvariantError('presentation_node_limit_exceeded')
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return
  }
  if (typeof value !== 'object') {
    throw new SavedFilterViewInvariantError('invalid_presentation_state')
  }
  if (seen.has(value)) {
    throw new SavedFilterViewInvariantError('cyclic_presentation_state')
  }
  seen.add(value)
  if (Array.isArray(value)) {
    for (const entry of value) assertJsonValue(entry, seen, depth + 1, budget)
    seen.delete(value)
    return
  }
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    throw new SavedFilterViewInvariantError('invalid_presentation_state')
  }
  for (const entry of Object.values(value)) assertJsonValue(entry, seen, depth + 1, budget)
  seen.delete(value)
}
__name(assertJsonValue, 'assertJsonValue')
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
__name(isRecord, 'isRecord')
function hasOnlyKeys(value, allowed) {
  const allowedKeys = new Set(allowed)
  return Object.keys(value).every((key) => allowedKeys.has(key))
}
__name(hasOnlyKeys, 'hasOnlyKeys')
function assertAcyclicSemanticJson(value, seen, depth = 0, budget = { nodes: 0 }) {
  if (depth > MAX_SAVED_FILTER_JSON_DEPTH) {
    throw new SavedFilterViewInvariantError('semantic_depth_exceeded')
  }
  budget.nodes += 1
  if (budget.nodes > MAX_SAVED_FILTER_JSON_NODES) {
    throw new SavedFilterViewInvariantError('semantic_node_limit_exceeded')
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return
  }
  if (typeof value !== 'object') {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  if (seen.has(value)) {
    throw new SavedFilterViewInvariantError('cyclic_semantic_payload')
  }
  if (!Array.isArray(value) && Object.prototype.toString.call(value) !== '[object Object]') {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  seen.add(value)
  for (const entry of Array.isArray(value) ? value : Object.values(value)) {
    assertAcyclicSemanticJson(entry, seen, depth + 1, budget)
  }
  seen.delete(value)
}
__name(assertAcyclicSemanticJson, 'assertAcyclicSemanticJson')
function hasExactFilterValueShape(value) {
  if (!isRecord(value) || typeof value['kind'] !== 'string') return false
  switch (value['kind']) {
    case 'scalar':
      return hasOnlyKeys(value, ['kind', 'value'])
    case 'set':
      return hasOnlyKeys(value, ['kind', 'values', 'minimumMatch'])
    case 'range':
      return hasOnlyKeys(value, ['kind', 'gte', 'gt', 'lte', 'lt'])
    case 'relative_time':
      return hasOnlyKeys(value, ['kind', 'amount', 'unit', 'anchor'])
    case 'hierarchy':
      return hasOnlyKeys(value, ['kind', 'termIds', 'expansion'])
    case 'relation':
      return (
        hasOnlyKeys(value, ['kind', 'expression', 'count']) &&
        hasExactFilterExpressionShape(value['expression']) &&
        (value['count'] === void 0 ||
          (isRecord(value['count']) && hasOnlyKeys(value['count'], ['gte', 'lte'])))
      )
    default:
      return false
  }
}
__name(hasExactFilterValueShape, 'hasExactFilterValueShape')
function hasExactFilterExpressionShape(value) {
  if (!isRecord(value)) return false
  if (value['kind'] === 'condition') {
    return (
      hasOnlyKeys(value, ['kind', 'field', 'operator', 'effect', 'unknown', 'value']) &&
      (value['value'] === void 0 || hasExactFilterValueShape(value['value']))
    )
  }
  return (
    value['kind'] === 'group' &&
    hasOnlyKeys(value, ['kind', 'combinator', 'negated', 'children']) &&
    Array.isArray(value['children']) &&
    value['children'].every(hasExactFilterExpressionShape)
  )
}
__name(hasExactFilterExpressionShape, 'hasExactFilterExpressionShape')
function assertSemanticState(value) {
  assertAcyclicSemanticJson(value, new WeakSet())
  if (!isRecord(value)) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  if (!hasOnlyKeys(value, ['filter', 'textQuery', 'sort', 'projection'])) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  const filter = value['filter']
  const textQuery = value['textQuery']
  const sort = value['sort']
  const projection = value['projection']
  if (
    filter !== null &&
    (!validateFilterExpression(filter).valid || !hasExactFilterExpressionShape(filter))
  ) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  if (
    textQuery !== null &&
    (typeof textQuery !== 'string' ||
      textQuery.length > DEFAULT_FILTER_VALIDATION_LIMITS.maxTextLength)
  ) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  if (
    !Array.isArray(sort) ||
    sort.length > MAX_SAVED_FILTER_SORT_FIELDS ||
    !sort.every(
      (entry) =>
        isRecord(entry) &&
        hasOnlyKeys(entry, ['field', 'direction']) &&
        typeof entry['field'] === 'string' &&
        entry['field'].trim().length > 0 &&
        entry['field'].length <= DEFAULT_FILTER_VALIDATION_LIMITS.maxTextLength &&
        (entry['direction'] === 'asc' || entry['direction'] === 'desc')
    )
  ) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  if (
    !Array.isArray(projection) ||
    projection.length > MAX_SAVED_FILTER_PROJECTION_FIELDS ||
    !projection.every(
      (field) =>
        typeof field === 'string' &&
        field.trim().length > 0 &&
        field.length <= DEFAULT_FILTER_VALIDATION_LIMITS.maxTextLength
    )
  ) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
}
__name(assertSemanticState, 'assertSemanticState')
function canonicalizeSemanticState(state) {
  assertSemanticState(state)
  const projection = [...new Set(state.projection.map((field) => field.trim()))]
  const sort = state.sort.map((entry) => ({
    field: entry.field.trim(),
    direction: entry.direction,
  }))
  return {
    filter: state.filter === null ? null : canonicalizeFilterExpression(state.filter),
    textQuery: state.textQuery === null ? null : state.textQuery.normalize('NFKC').trim(),
    sort,
    projection,
  }
}
__name(canonicalizeSemanticState, 'canonicalizeSemanticState')
function isValidIsoTimestamp(value) {
  if (typeof value !== 'string') return false
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-](\d{2}):(\d{2}))$/u.exec(
      value
    )
  if (!match || !Number.isFinite(Date.parse(value))) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const offsetHour = match[7] === void 0 ? 0 : Number(match[7])
  const offsetMinute = match[8] === void 0 ? 0 : Number(match[8])
  const daysInMonth =
    Number.isSafeInteger(year) && Number.isSafeInteger(month) && month >= 1 && month <= 12
      ? new Date(Date.UTC(year, month, 0)).getUTCDate()
      : 0
  return (
    day >= 1 &&
    day <= daysInMonth &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59
  )
}
__name(isValidIsoTimestamp, 'isValidIsoTimestamp')
function serializeSavedFilterSemanticState(state) {
  return stableJson(canonicalizeSemanticState(state))
}
__name(serializeSavedFilterSemanticState, 'serializeSavedFilterSemanticState')
function hashSavedFilterSemanticState(state, hashGenerator) {
  return hashGenerator.hash(serializeSavedFilterSemanticState(state))
}
__name(hashSavedFilterSemanticState, 'hashSavedFilterSemanticState')
function parseSavedFilterSemanticState(payloadJson) {
  let parsed
  try {
    parsed = JSON.parse(payloadJson)
  } catch {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  assertSemanticState(parsed)
  return canonicalizeSemanticState(parsed)
}
__name(parseSavedFilterSemanticState, 'parseSavedFilterSemanticState')
function createSavedFilterView(input, options = {}, hashGenerator) {
  invariant(isRecord(input), 'invalid_saved_filter_view')
  invariant(typeof input.id === 'string', 'invalid_view_id')
  invariant(typeof input.name === 'string', 'invalid_view_name')
  invariant(
    input.description === null || typeof input.description === 'string',
    'invalid_description'
  )
  invariant(typeof input.ownerId === 'string', 'invalid_owner_id')
  const runtimeVisibility = input.visibility
  invariant(
    runtimeVisibility === 'private' ||
      runtimeVisibility === 'team' ||
      runtimeVisibility === 'organization',
    'invalid_visibility'
  )
  invariant(
    input.organizationId === null || typeof input.organizationId === 'string',
    'invalid_visibility_scope'
  )
  invariant(input.teamId === null || typeof input.teamId === 'string', 'invalid_visibility_scope')
  invariant(isRecord(input.context), 'invalid_context')
  invariant(typeof input.context.key === 'string', 'invalid_context_key')
  invariant(typeof input.context.owner === 'string', 'invalid_context_owner')
  invariant(typeof input.isDefault === 'boolean', 'invalid_default_state')
  invariant(typeof input.isPinned === 'boolean', 'invalid_pinned_state')
  const runtimeAlertState = input.alertState
  invariant(isRecord(runtimeAlertState), 'invalid_alert_state')
  const runtimeAlertStatus = runtimeAlertState['status']
  const runtimeAlertReason = runtimeAlertState['reason']
  invariant(
    runtimeAlertStatus === 'disabled' ||
      runtimeAlertStatus === 'active' ||
      runtimeAlertStatus === 'paused',
    'invalid_alert_state'
  )
  invariant(
    runtimeAlertReason === null || typeof runtimeAlertReason === 'string',
    'invalid_alert_reason'
  )
  invariant(
    runtimeAlertStatus !== 'paused' ||
      (typeof runtimeAlertReason === 'string' && runtimeAlertReason.trim().length > 0),
    'invalid_alert_reason'
  )
  invariant(isValidIsoTimestamp(input.createdAt), 'invalid_created_at')
  invariant(isValidIsoTimestamp(input.updatedAt), 'invalid_updated_at')
  invariant(Date.parse(input.updatedAt) >= Date.parse(input.createdAt), 'invalid_timestamp_order')
  assertSemanticState(input.semanticState)
  invariant(isRecord(input.presentationState), 'invalid_presentation_state')
  invariant(input.id.trim().length > 0, 'invalid_view_id')
  invariant(input.name.trim().length > 0, 'invalid_view_name')
  invariant(input.ownerId.trim().length > 0, 'invalid_owner_id')
  invariant(input.context.key.trim().length > 0, 'invalid_context_key')
  invariant(input.context.owner.trim().length > 0, 'invalid_context_owner')
  invariant(
    Number.isSafeInteger(input.context.schemaVersion) && input.context.schemaVersion >= 1,
    'invalid_schema_version'
  )
  invariant(
    Number.isSafeInteger(input.lastSuccessfulMigrationVersion) &&
      input.lastSuccessfulMigrationVersion >= 1 &&
      input.lastSuccessfulMigrationVersion <= input.context.schemaVersion,
    'invalid_last_migration_version'
  )
  const organizationId = input.organizationId?.trim() ?? null
  const teamId = input.teamId?.trim() ?? null
  const validVisibilityScope =
    (input.visibility === 'private' && organizationId === null && teamId === null) ||
    (input.visibility === 'team' &&
      organizationId !== null &&
      organizationId.length > 0 &&
      teamId !== null &&
      teamId.length > 0) ||
    (input.visibility === 'organization' &&
      organizationId !== null &&
      organizationId.length > 0 &&
      teamId === null)
  invariant(validVisibilityScope, 'invalid_visibility_scope')
  invariant(!input.isDefault || input.isPinned, 'default_must_be_pinned')
  invariant(!input.isDefault || input.visibility === 'private', 'shared_view_cannot_be_default')
  assertJsonValue(input.presentationState, new WeakSet())
  const semanticState = canonicalizeSemanticState(input.semanticState)
  const presentationState = JSON.parse(stableJson(input.presentationState))
  const semanticJson = serializeSavedFilterSemanticState(semanticState)
  const canonicalPayload = stableJson({ presentationState, semanticState })
  const canonicalPayloadBytes = Buffer.byteLength(canonicalPayload, 'utf8')
  const maxCanonicalPayloadBytes =
    options.maxCanonicalPayloadBytes ?? DEFAULT_MAX_SAVED_FILTER_CANONICAL_PAYLOAD_BYTES
  invariant(
    Number.isSafeInteger(maxCanonicalPayloadBytes) && maxCanonicalPayloadBytes >= 1,
    'invalid_payload_size_bound'
  )
  invariant(canonicalPayloadBytes <= maxCanonicalPayloadBytes, 'canonical_payload_too_large')
  return {
    ...input,
    id: input.id.trim(),
    name: input.name.normalize('NFKC').trim(),
    ownerId: input.ownerId.trim(),
    organizationId,
    teamId,
    context: {
      key: input.context.key.trim(),
      owner: input.context.owner.trim(),
      schemaVersion: input.context.schemaVersion,
    },
    semanticState,
    presentationState,
    semanticChecksum: hashGenerator.hash(semanticJson),
    canonicalPayloadBytes,
  }
}
__name(createSavedFilterView, 'createSavedFilterView')
function resolveSavedFilterViewAccess(view, access) {
  if (!access.ownerExists) return 'owner_missing'
  const isOwner = access.actorId === view.ownerId
  if (view.visibility === 'private') return isOwner ? 'owner' : 'denied'
  if (!view.organizationId || !access.organizationIds.includes(view.organizationId)) return 'denied'
  if (view.visibility === 'organization') return isOwner ? 'owner' : 'viewer'
  if (!view.teamId || !access.teamIds.includes(view.teamId)) return 'denied'
  return isOwner ? 'owner' : 'viewer'
}
__name(resolveSavedFilterViewAccess, 'resolveSavedFilterViewAccess')
function assertUniqueDefaultSavedFilterViews(views) {
  const defaults = new Set()
  for (const view of views) {
    if (!view.isDefault) continue
    const key = `${view.ownerId}\0${view.context.owner}\0${view.context.key}`
    invariant(!defaults.has(key), 'multiple_defaults_for_owner_context')
    defaults.add(key)
  }
}
__name(assertUniqueDefaultSavedFilterViews, 'assertUniqueDefaultSavedFilterViews')
function applyFilterMigrationResult(view, result, hashGenerator) {
  invariant(
    result.contextKey === view.context.key && result.contextOwner === view.context.owner,
    'migration_context_mismatch'
  )
  invariant(result.fromVersion === view.context.schemaVersion, 'migration_source_version_mismatch')
  invariant(result.inputChecksum === view.semanticChecksum, 'stale_migration_result')
  if (result.outcome === 'blocked' || result.outcome === 'requires_repair') {
    return {
      ...view,
      alertState:
        view.alertState.status === 'disabled'
          ? view.alertState
          : {
              status: 'paused',
              reason:
                result.outcome === 'blocked' ? 'migration_blocked' : 'migration_requires_repair',
            },
    }
  }
  const upgradeOrSame = result.requestedToVersion >= result.fromVersion
  const versionEnvelopeValid = upgradeOrSame
    ? result.effectiveVersion >= result.fromVersion &&
      result.effectiveVersion <= result.requestedToVersion &&
      result.readerVersion === null
    : result.outcome === 'compatible' &&
      result.effectiveVersion === result.fromVersion &&
      result.readerVersion === result.requestedToVersion
  invariant(versionEnvelopeValid, 'migration_result_version_mismatch')
  const atomicPayload = result.atomicPayload
  invariant(atomicPayload !== null, 'missing_atomic_migration_payload')
  invariant(
    atomicPayload.contextKey === view.context.key &&
      atomicPayload.contextOwner === view.context.owner &&
      atomicPayload.schemaVersion === result.effectiveVersion,
    'invalid_atomic_migration_payload'
  )
  const semanticState = parseSavedFilterSemanticState(atomicPayload.payloadJson)
  invariant(
    hashSavedFilterSemanticState(semanticState, hashGenerator) === atomicPayload.checksum,
    'atomic_migration_checksum_mismatch'
  )
  return createSavedFilterView(
    {
      ...view,
      context: { ...view.context, schemaVersion: atomicPayload.schemaVersion },
      semanticState,
      lastSuccessfulMigrationVersion: Math.max(
        view.lastSuccessfulMigrationVersion,
        atomicPayload.schemaVersion
      ),
    },
    {},
    hashGenerator
  )
}
__name(applyFilterMigrationResult, 'applyFilterMigrationResult')
export {
  DEFAULT_MAX_SAVED_FILTER_CANONICAL_PAYLOAD_BYTES,
  SavedFilterViewInvariantError,
  applyFilterMigrationResult,
  assertUniqueDefaultSavedFilterViews,
  createSavedFilterView,
  hashSavedFilterSemanticState,
  parseSavedFilterSemanticState,
  resolveSavedFilterViewAccess,
  serializeSavedFilterSemanticState,
}
export type SavedFilterJsonValue = any
export type SavedFilterSemanticState = any
export type SavedFilterViewVisibility = any
export type SavedFilterView = any
export type CreateSavedFilterViewInput = any
