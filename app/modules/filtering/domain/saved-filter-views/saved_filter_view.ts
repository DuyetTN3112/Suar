import {
  assertJsonValue,
  assertSemanticState,
  canonicalizeSemanticState,
  hashSavedFilterSemanticState,
  isRecord,
  parseSavedFilterSemanticState,
  SavedFilterViewInvariantError,
  serializeSavedFilterSemanticState,
  stableJson,
  type SavedFilterJsonValue,
  type SavedFilterSemanticState,
  type SavedFilterSortEntry,
} from './saved_filter_json_codec.js'
import { isValidIsoTimestamp } from './saved_filter_timestamp.js'

import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'

// Re-export codec utilities, errors, and types for backward compatibility
export {
  MAX_SAVED_FILTER_JSON_DEPTH,
  MAX_SAVED_FILTER_JSON_NODES,
  MAX_SAVED_FILTER_PROJECTION_FIELDS,
  MAX_SAVED_FILTER_SORT_FIELDS,
  SavedFilterViewInvariantError,
  assertAcyclicSemanticJson,
  assertJsonValue,
  assertSemanticState,
  canonicalizeSemanticState,
  hasExactFilterExpressionShape,
  hasExactFilterValueShape,
  hasOnlyKeys,
  hashSavedFilterSemanticState,
  isRecord,
  parseSavedFilterSemanticState,
  serializeSavedFilterSemanticState,
  stableJson,
} from './saved_filter_json_codec.js'
export { isValidIsoTimestamp } from './saved_filter_timestamp.js'

export type { SavedFilterJsonValue, SavedFilterSemanticState, SavedFilterSortEntry }

export const DEFAULT_MAX_SAVED_FILTER_CANONICAL_PAYLOAD_BYTES = 65536

function invariant(condition: boolean, code: string): asserts condition {
  if (!condition) {
    throw new SavedFilterViewInvariantError(code)
  }
}

export type SavedFilterViewVisibility = 'private' | 'team' | 'organization'

export interface SavedFilterViewContext {
  key: string
  owner: string
  schemaVersion: number
}

export interface SavedFilterAlertState {
  status: 'disabled' | 'active' | 'paused'
  reason: string | null
}

export interface CreateSavedFilterViewInput {
  id: string
  name: string
  description?: string | null | undefined
  ownerId: string
  visibility: SavedFilterViewVisibility
  organizationId?: string | null | undefined
  teamId?: string | null | undefined
  context: SavedFilterViewContext
  isDefault: boolean
  isPinned: boolean
  alertState: SavedFilterAlertState
  createdAt: string
  updatedAt: string
  semanticState: SavedFilterSemanticState
  presentationState: Record<string, unknown>
  lastSuccessfulMigrationVersion: number
}

export interface SavedFilterView extends CreateSavedFilterViewInput {
  description: string | null
  organizationId: string | null
  teamId: string | null
  semanticChecksum: string
  canonicalPayloadBytes: number
}

export interface CreateSavedFilterViewOptions {
  maxCanonicalPayloadBytes?: number
}

export function createSavedFilterView(
  input: CreateSavedFilterViewInput,
  options: CreateSavedFilterViewOptions = {},
  hashGenerator: FilterHashGenerator
): SavedFilterView {
  invariant(isRecord(input), 'invalid_saved_filter_view')
  invariant(typeof input.id === 'string', 'invalid_view_id')
  invariant(typeof input.name === 'string', 'invalid_view_name')
  invariant(
    input.description === null || input.description === undefined || typeof input.description === 'string',
    'invalid_description'
  )
  invariant(typeof input.ownerId === 'string', 'invalid_owner_id')
  const runtimeVisibility: string = input.visibility
  invariant(
    runtimeVisibility === 'private' ||
      runtimeVisibility === 'team' ||
      runtimeVisibility === 'organization',
    'invalid_visibility'
  )
  invariant(
    input.organizationId === null || input.organizationId === undefined || typeof input.organizationId === 'string',
    'invalid_visibility_scope'
  )
  invariant(input.teamId === null || input.teamId === undefined || typeof input.teamId === 'string', 'invalid_visibility_scope')
  invariant(isRecord(input.context), 'invalid_context')
  invariant(typeof input.context.key === 'string', 'invalid_context_key')
  invariant(typeof input.context.owner === 'string', 'invalid_context_owner')
  invariant(typeof input.isDefault === 'boolean', 'invalid_default_state')
  invariant(typeof input.isPinned === 'boolean', 'invalid_pinned_state')
  const runtimeAlertState = input.alertState
  invariant(isRecord(runtimeAlertState), 'invalid_alert_state')
  const runtimeAlertStatus: string = runtimeAlertState['status']
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
  const presentationState = JSON.parse(stableJson(input.presentationState)) as Record<string, unknown>
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
    description: input.description ?? null,
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

export type SavedFilterViewAccessLevel = 'owner' | 'viewer' | 'denied' | 'owner_missing'

export interface SavedFilterViewAccessQuery {
  actorId: string
  organizationIds: readonly string[]
  teamIds: readonly string[]
  ownerExists: boolean
}

export function resolveSavedFilterViewAccess(
  view: SavedFilterView,
  access: SavedFilterViewAccessQuery
): SavedFilterViewAccessLevel {
  if (!access.ownerExists) return 'owner_missing'
  const isOwner = access.actorId === view.ownerId
  if (view.visibility === 'private') return isOwner ? 'owner' : 'denied'
  if (!view.organizationId || !access.organizationIds.includes(view.organizationId)) return 'denied'
  if (view.visibility === 'organization') return isOwner ? 'owner' : 'viewer'
  if (!view.teamId || !access.teamIds.includes(view.teamId)) return 'denied'
  return isOwner ? 'owner' : 'viewer'
}

export function assertUniqueDefaultSavedFilterViews(views: readonly SavedFilterView[]): void {
  const defaults = new Set<string>()
  for (const view of views) {
    if (!view.isDefault) continue
    const key = `${view.ownerId}\0${view.context.owner}\0${view.context.key}`
    invariant(!defaults.has(key), 'multiple_defaults_for_owner_context')
    defaults.add(key)
  }
}

export interface FilterMigrationResult {
  contextKey: string
  contextOwner: string
  fromVersion: number
  inputChecksum: string
  outcome: 'blocked' | 'requires_repair' | 'compatible' | string
  requestedToVersion: number
  effectiveVersion: number
  readerVersion: number | null
  atomicPayload: {
    contextKey: string
    contextOwner: string
    schemaVersion: number
    payloadJson: string
    checksum: string
  } | null
}

export function applyFilterMigrationResult(
  view: SavedFilterView,
  result: FilterMigrationResult,
  hashGenerator: FilterHashGenerator
): SavedFilterView {
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
