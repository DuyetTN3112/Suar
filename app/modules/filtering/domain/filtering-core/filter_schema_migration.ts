import {
  applyStep,
  canonicalSource,
  diagnostic,
  failedResult,
  type FilterSchemaForwardReader,
  type FilterSchemaMigrationInput,
  type FilterSchemaMigrationOperation,
  type FilterSchemaMigrationStep,
  successfulResult,
} from './filter_schema_migration_engine.js'

import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'
import type {
  FilterMigrationReceipt,
  FilterMigrationResult,
} from '#modules/filtering/domain/filtering-core/filter_migration_result'
import {
  hashSavedFilterSemanticState,
  SavedFilterViewInvariantError,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'

export type {
  FilterSchemaForwardReader,
  FilterSchemaMigrationInput,
  FilterSchemaMigrationOperation,
  FilterSchemaMigrationStep,
}

export function migrateFilterSchema(
  input: FilterSchemaMigrationInput,
  hashGenerator: FilterHashGenerator
): FilterMigrationResult {
  let rawPayloadJson: string
  if (typeof input.payload === 'string') {
    rawPayloadJson = input.payload
  } else {
    try {
      const serialized = JSON.stringify(input.payload)
      rawPayloadJson =
        typeof serialized === 'string' ? serialized : '[unserializable_semantic_payload]'
    } catch {
      rawPayloadJson = '[unserializable_semantic_payload]'
    }
  }
  let source: ReturnType<typeof canonicalSource>
  try {
    source = canonicalSource(input.payload, hashGenerator)
  } catch (error) {
    const code =
      error instanceof SavedFilterViewInvariantError ? error.code : 'corrupt_semantic_payload'
    return failedResult({
      request: input,
      inputChecksum: hashGenerator.hash(rawPayloadJson),
      preservedPayloadJson: rawPayloadJson,
      outcome: 'blocked',
      diagnostics: [diagnostic(code, 'Saved filter semantic payload is not readable')],
    })
  }

  if (input.inputChecksum !== null && input.inputChecksum !== source.checksum) {
    return failedResult({
      request: input,
      inputChecksum: source.checksum,
      preservedPayloadJson: source.payloadJson,
      outcome: 'blocked',
      diagnostics: [
        diagnostic('input_checksum_mismatch', 'Input checksum does not match canonical payload'),
      ],
    })
  }
  if (
    !Number.isSafeInteger(input.fromVersion) ||
    !Number.isSafeInteger(input.toVersion) ||
    input.fromVersion < 1 ||
    input.toVersion < 1
  ) {
    return failedResult({
      request: input,
      inputChecksum: source.checksum,
      preservedPayloadJson: source.payloadJson,
      outcome: 'blocked',
      diagnostics: [
        diagnostic('invalid_schema_version', 'Schema versions must be positive integers'),
      ],
    })
  }

  if (input.toVersion < input.fromVersion) {
    const readers = input.forwardReaders.filter(
      (reader) =>
        reader.readerVersion === input.toVersion &&
        reader.readableSchemaVersions.includes(input.fromVersion)
    )
    if (readers.length !== 1) {
      return failedResult({
        request: input,
        inputChecksum: source.checksum,
        preservedPayloadJson: source.payloadJson,
        outcome: 'blocked',
        diagnostics: [
          diagnostic(
            'schema_downgrade_not_supported',
            'A forward reader or explicit reverse migration is required for rollback'
          ),
        ],
      })
    }
    const reader = readers[0]
    if (!reader) {
      return failedResult({
        request: input,
        inputChecksum: source.checksum,
        preservedPayloadJson: source.payloadJson,
        outcome: 'blocked',
        diagnostics: [diagnostic('schema_downgrade_not_supported', 'Forward reader is missing')],
      })
    }
    if (reader.contextKey !== input.contextKey || reader.contextOwner !== input.contextOwner) {
      return failedResult({
        request: input,
        inputChecksum: source.checksum,
        preservedPayloadJson: source.payloadJson,
        outcome: 'blocked',
        diagnostics: [
          diagnostic('migration_context_mismatch', 'Forward reader belongs to another context'),
        ],
      })
    }
    const receipt: FilterMigrationReceipt = {
      migrationId: reader.id,
      inputChecksum: source.checksum,
      outputChecksum: source.checksum,
      idempotencyKey: `${reader.id}:${source.checksum}`,
    }
    return successfulResult({
      request: input,
      inputChecksum: source.checksum,
      state: source.state,
      schemaVersion: input.fromVersion,
      readerVersion: input.toVersion,
      outcome: 'compatible',
      hashGenerator,
      receipts: [receipt],
    })
  }

  if (input.toVersion === input.fromVersion) {
    return successfulResult({
      request: input,
      inputChecksum: source.checksum,
      state: source.state,
      schemaVersion: input.fromVersion,
      outcome: 'compatible',
      hashGenerator,
    })
  }

  let currentVersion = input.fromVersion
  let currentState = source.state
  let migrated = false
  const visitedVersions = new Set([currentVersion])
  const migrationIds = new Set<string>()
  const receipts: FilterMigrationReceipt[] = []

  while (currentVersion < input.toVersion) {
    const candidates = input.migrations.filter((step) => step.fromVersion === currentVersion)
    if (candidates.length === 0) {
      return failedResult({
        request: input,
        inputChecksum: source.checksum,
        preservedPayloadJson: source.payloadJson,
        outcome: 'blocked',
        receipts,
        diagnostics: [
          diagnostic(
            'missing_migration_hop',
            `No migration starts at schema version ${currentVersion}`
          ),
        ],
      })
    }
    if (candidates.length > 1) {
      return failedResult({
        request: input,
        inputChecksum: source.checksum,
        preservedPayloadJson: source.payloadJson,
        outcome: 'blocked',
        receipts,
        diagnostics: [
          diagnostic('ambiguous_migration_hop', `Multiple migrations start at ${currentVersion}`),
        ],
      })
    }

    const step = candidates[0]
    if (!step) {
      return failedResult({
        request: input,
        inputChecksum: source.checksum,
        preservedPayloadJson: source.payloadJson,
        outcome: 'blocked',
        receipts,
        diagnostics: [
          diagnostic(
            'missing_migration_hop',
            `No migration starts at schema version ${currentVersion}`
          ),
        ],
      })
    }
    if (step.contextKey !== input.contextKey || step.contextOwner !== input.contextOwner) {
      return failedResult({
        request: input,
        inputChecksum: source.checksum,
        preservedPayloadJson: source.payloadJson,
        outcome: 'blocked',
        receipts,
        diagnostics: [
          diagnostic(
            'migration_context_mismatch',
            `Migration ${step.id} belongs to another context`
          ),
        ],
      })
    }
    if (
      step.toVersion <= currentVersion ||
      step.toVersion > input.toVersion ||
      visitedVersions.has(step.toVersion) ||
      migrationIds.has(step.id)
    ) {
      return failedResult({
        request: input,
        inputChecksum: source.checksum,
        preservedPayloadJson: source.payloadJson,
        outcome: 'blocked',
        receipts,
        diagnostics: [
          diagnostic('migration_cycle', `Migration ${step.id} does not advance safely`),
        ],
      })
    }

    const stepInputChecksum = hashSavedFilterSemanticState(currentState, hashGenerator)
    const applied = applyStep(currentState, step)
    if (applied.diagnostic) {
      return failedResult({
        request: input,
        inputChecksum: source.checksum,
        preservedPayloadJson: source.payloadJson,
        outcome: 'requires_repair',
        receipts,
        diagnostics: [applied.diagnostic],
      })
    }
    const stepOutputChecksum = hashSavedFilterSemanticState(applied.state, hashGenerator)
    receipts.push({
      migrationId: step.id,
      inputChecksum: stepInputChecksum,
      outputChecksum: stepOutputChecksum,
      idempotencyKey: `${step.id}:${stepInputChecksum}`,
    })
    currentState = applied.state
    migrated ||= applied.changed
    currentVersion = step.toVersion
    visitedVersions.add(currentVersion)
    migrationIds.add(step.id)
  }

  return successfulResult({
    request: input,
    inputChecksum: source.checksum,
    state: currentState,
    schemaVersion: currentVersion,
    outcome: migrated ? 'migrated' : 'compatible',
    hashGenerator,
    receipts,
  })
}
