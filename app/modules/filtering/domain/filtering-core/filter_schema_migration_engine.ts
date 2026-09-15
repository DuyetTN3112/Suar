import {
  diagnostic,
  type FilterSchemaMigrationOperation,
  transformExpression,
} from './filter_schema_migration_transform.js'

import { canonicalizeFilterExpression } from '#modules/filtering/domain/filtering-core/filter_canonicalizer'
import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'
import type {
  AtomicFilterMigrationPayload,
  FailedFilterMigrationResult,
  FilterMigrationDiagnostic,
  FilterMigrationReceipt,
  SuccessfulFilterMigrationResult,
} from '#modules/filtering/domain/filtering-core/filter_migration_result'
import {
  hashSavedFilterSemanticState,
  parseSavedFilterSemanticState,
  serializeSavedFilterSemanticState,
  type SavedFilterSemanticState,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'

export * from './filter_schema_migration_transform.js'

export interface FilterSchemaMigrationStep {
  readonly id: string
  readonly contextKey: string
  readonly contextOwner: string
  readonly fromVersion: number
  readonly toVersion: number
  readonly operations: readonly FilterSchemaMigrationOperation[]
}

export interface FilterSchemaForwardReader {
  readonly id: string
  readonly contextKey: string
  readonly contextOwner: string
  readonly readerVersion: number
  readonly readableSchemaVersions: readonly number[]
}

export interface FilterSchemaMigrationInput {
  readonly contextKey: string
  readonly contextOwner: string
  readonly fromVersion: number
  readonly toVersion: number
  readonly payload: SavedFilterSemanticState | string
  readonly inputChecksum: string | null
  readonly migrations: readonly FilterSchemaMigrationStep[]
  readonly forwardReaders: readonly FilterSchemaForwardReader[]
}

export interface OperationResult {
  readonly state: SavedFilterSemanticState
  readonly changed: boolean
  readonly diagnostic: FilterMigrationDiagnostic | null
}

export function failedResult(input: {
  request: FilterSchemaMigrationInput
  inputChecksum: string
  preservedPayloadJson: string
  outcome: 'requires_repair' | 'blocked'
  diagnostics: readonly FilterMigrationDiagnostic[]
  receipts?: readonly FilterMigrationReceipt[]
}): FailedFilterMigrationResult {
  return {
    outcome: input.outcome,
    contextKey: input.request.contextKey,
    contextOwner: input.request.contextOwner,
    fromVersion: input.request.fromVersion,
    requestedToVersion: input.request.toVersion,
    effectiveVersion: input.request.fromVersion,
    readerVersion: null,
    inputChecksum: input.inputChecksum,
    migrationReceipts: input.receipts ?? [],
    diagnostics: input.diagnostics,
    alertDisposition:
      input.outcome === 'requires_repair' ? 'pause_requires_repair' : 'pause_blocked',
    atomicPayload: null,
    preservedPayloadJson: input.preservedPayloadJson,
  }
}

export function successfulResult(input: {
  request: FilterSchemaMigrationInput
  inputChecksum: string
  state: SavedFilterSemanticState
  schemaVersion: number
  outcome: 'compatible' | 'migrated'
  hashGenerator: FilterHashGenerator
  readerVersion?: number | null
  receipts?: readonly FilterMigrationReceipt[]
}): SuccessfulFilterMigrationResult {
  const payloadJson = serializeSavedFilterSemanticState(input.state)
  const checksum = hashSavedFilterSemanticState(input.state, input.hashGenerator)
  const atomicPayload: AtomicFilterMigrationPayload = {
    contextKey: input.request.contextKey,
    contextOwner: input.request.contextOwner,
    schemaVersion: input.schemaVersion,
    payloadJson,
    checksum,
  }
  return {
    outcome: input.outcome,
    contextKey: input.request.contextKey,
    contextOwner: input.request.contextOwner,
    fromVersion: input.request.fromVersion,
    requestedToVersion: input.request.toVersion,
    effectiveVersion: input.schemaVersion,
    readerVersion: input.readerVersion ?? null,
    inputChecksum: input.inputChecksum,
    migrationReceipts: input.receipts ?? [],
    diagnostics: [],
    alertDisposition: 'unchanged',
    atomicPayload,
    preservedPayloadJson: null,
  }
}

export function applyStep(
  state: SavedFilterSemanticState,
  step: FilterSchemaMigrationStep
): OperationResult {
  let current = state
  let changed = false
  for (const operation of step.operations) {
    let operationChanged = false
    if (current.filter) {
      const transformed = transformExpression(current.filter, operation)
      if (transformed.diagnostic) {
        return { state, changed: false, diagnostic: transformed.diagnostic }
      }
      if (transformed.changed) {
        current = { ...current, filter: canonicalizeFilterExpression(transformed.expression) }
        operationChanged = true
      }
    }

    if (operation.kind === 'rename_field') {
      const sort = current.sort.map((entry) =>
        entry.field === operation.fromField ? { ...entry, field: operation.toField } : entry
      )
      const projection = current.projection.map((field) =>
        field === operation.fromField ? operation.toField : field
      )
      const semanticReferenceChanged =
        sort.some((entry, index) => entry !== current.sort[index]) ||
        projection.some((field, index) => field !== current.projection[index])
      if (semanticReferenceChanged) {
        current = { ...current, sort, projection }
        operationChanged = true
      }
    }

    if (!operationChanged) continue
    try {
      current = parseSavedFilterSemanticState(serializeSavedFilterSemanticState(current))
    } catch {
      return {
        state,
        changed: false,
        diagnostic: diagnostic(
          'migration_produced_invalid_criteria',
          `Migration ${step.id} produced criteria that violate the filter contract`
        ),
      }
    }
    changed = true
  }
  return { state: current, changed, diagnostic: null }
}

export function canonicalSource(
  payload: SavedFilterSemanticState | string,
  hashGenerator: FilterHashGenerator
): {
  state: SavedFilterSemanticState
  payloadJson: string
  checksum: string
} {
  const state =
    typeof payload === 'string'
      ? parseSavedFilterSemanticState(payload)
      : parseSavedFilterSemanticState(serializeSavedFilterSemanticState(payload))
  const payloadJson = serializeSavedFilterSemanticState(state)
  return { state, payloadJson, checksum: hashSavedFilterSemanticState(state, hashGenerator) }
}
