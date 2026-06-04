import { canonicalizeFilterExpression } from '#modules/filtering/domain/filtering-core/filter_canonicalizer'
import type {
  FilterCondition,
  FilterExpression,
  FilterValue,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'
import type {
  AtomicFilterMigrationPayload,
  FailedFilterMigrationResult,
  FilterMigrationDiagnostic,
  FilterMigrationReceipt,
  FilterMigrationResult,
  SuccessfulFilterMigrationResult,
} from '#modules/filtering/domain/filtering-core/filter_migration_result'
import { canonicalizeFilterScalarSet } from '#modules/filtering/domain/filtering-core/filter_operators'
import {
  hashSavedFilterSemanticState,
  parseSavedFilterSemanticState,
  serializeSavedFilterSemanticState,
  type SavedFilterSemanticState,
  SavedFilterViewInvariantError,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'

export type FilterSchemaMigrationOperation =
  | {
      readonly kind: 'rename_field'
      readonly fromField: string
      readonly toField: string
    }
  | {
      readonly kind: 'change_operator'
      readonly field: string
      readonly fromOperator: string
      readonly toOperator: string
      readonly valueTransform?: 'preserve' | 'scalar_to_set'
    }
  | {
      readonly kind: 'taxonomy_merge'
      readonly field: string
      readonly sourceTermIds: readonly string[]
      readonly replacementTermId: string
    }
  | {
      readonly kind: 'taxonomy_retire'
      readonly field: string
      readonly termId: string
      readonly replacementTermId: string | null
    }
  | {
      readonly kind: 'taxonomy_split'
      readonly field: string
      readonly termId: string
      readonly replacementTermIds: readonly string[]
    }

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

interface OperationResult {
  readonly state: SavedFilterSemanticState
  readonly changed: boolean
  readonly diagnostic: FilterMigrationDiagnostic | null
}

function withConditionValue(
  condition: FilterCondition,
  value: FilterValue | undefined
): FilterCondition {

  const { value: _currentValue, ...withoutValue } = condition
  return value === undefined ? withoutValue : { ...withoutValue, value }
}

function diagnostic(code: string, message: string, path: string | null = null) {
  return { code, path, message } satisfies FilterMigrationDiagnostic
}

function failedResult(input: {
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

function successfulResult(input: {
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

function mapFilterValueTerms(
  value: FilterValue | undefined,
  replacements: ReadonlyMap<string, string>
): { value: FilterValue | undefined; changed: boolean } {
  if (!value) return { value, changed: false }
  if (value.kind === 'scalar') {
    if (typeof value.value !== 'string') return { value, changed: false }
    const replacement = replacements.get(value.value)
    return replacement
      ? { value: { kind: 'scalar', value: replacement }, changed: replacement !== value.value }
      : { value, changed: false }
  }
  if (value.kind === 'set') {
    let changed = false
    const values = value.values.map((entry) => {
      if (typeof entry !== 'string') return entry
      const replacement = replacements.get(entry)
      if (replacement && replacement !== entry) changed = true
      return replacement ?? entry
    })
    return {
      value: value.minimumMatch === undefined ? { kind: 'set', values } : { ...value, values },
      changed,
    }
  }
  if (value.kind === 'hierarchy') {
    let changed = false
    const termIds = value.termIds.map((termId) => {
      const replacement = replacements.get(termId)
      if (replacement && replacement !== termId) changed = true
      return replacement ?? termId
    })
    return { value: { ...value, termIds }, changed }
  }
  return { value, changed: false }
}

function filterValueContainsTerm(value: FilterValue | undefined, termId: string): boolean {
  if (!value) return false
  if (value.kind === 'scalar') return value.value === termId
  if (value.kind === 'set') return value.values.includes(termId)
  if (value.kind === 'hierarchy') return value.termIds.includes(termId)
  return false
}

function taxonomyMinimumMatchDiagnostic(
  value: FilterValue | undefined,
  field: string
): FilterMigrationDiagnostic | null {
  if (value?.kind !== 'set' || value.minimumMatch === undefined) return null
  if (value.minimumMatch <= canonicalizeFilterScalarSet(value.values).length) return null
  return diagnostic(
    'taxonomy_minimum_match_requires_repair',
    'Taxonomy replacement collapsed selected terms below the required minimum match',
    `filter.${field}`
  )
}

function transformExpression(
  expression: FilterExpression,
  operation: FilterSchemaMigrationOperation
): {

  expression: FilterExpression
  changed: boolean
  diagnostic: FilterMigrationDiagnostic | null
} {
  if (expression.kind === 'group') {
    let changed = false
    const children: FilterExpression[] = []
    for (const child of expression.children) {
      const transformed = transformExpression(child, operation)
      if (transformed.diagnostic) return transformed
      changed ||= transformed.changed
      children.push(transformed.expression)
    }
    return {
      expression: changed ? { ...expression, children } : expression,
      changed,
      diagnostic: null,
    }
  }

  let condition: FilterCondition = expression
  let changed = false
  if (condition.value?.kind === 'relation') {
    const nested = transformExpression(condition.value.expression, operation)
    if (nested.diagnostic) return nested
    if (nested.changed) {
      condition = { ...condition, value: { ...condition.value, expression: nested.expression } }
      changed = true
    }
  }

  switch (operation.kind) {
    case 'rename_field':
      if (condition.field === operation.fromField) {
        condition = { ...condition, field: operation.toField }
        changed = true
      }
      break
    case 'change_operator':
      if (condition.field === operation.field && condition.operator === operation.fromOperator) {
        let value = condition.value
        if (operation.valueTransform === 'scalar_to_set' && value?.kind === 'scalar') {
          value = { kind: 'set', values: [value.value] }
        }
        condition = {
          ...withConditionValue(condition, value),
          operator: operation.toOperator,
        }
        changed = true
      }
      break
    case 'taxonomy_merge':
      if (condition.field === operation.field) {
        const replacements = new Map(
          operation.sourceTermIds.map((termId) => [termId, operation.replacementTermId])
        )
        const transformed = mapFilterValueTerms(condition.value, replacements)
        if (transformed.changed) {
          const minimumMatchDiagnostic = taxonomyMinimumMatchDiagnostic(
            transformed.value,
            condition.field
          )
          if (minimumMatchDiagnostic) {
            return {
              expression,
              changed: false,
              diagnostic: minimumMatchDiagnostic,
            }
          }
          condition = withConditionValue(condition, transformed.value)
          changed = true
        }
      }
      break
    case 'taxonomy_retire':
      if (
        condition.field === operation.field &&
        filterValueContainsTerm(condition.value, operation.termId)
      ) {
        if (!operation.replacementTermId) {
          return {
            expression,
            changed: false,
            diagnostic: diagnostic(
              'retired_taxonomy_term_requires_repair',
              `Retired taxonomy term ${operation.termId} has no deterministic replacement`,
              `filter.${condition.field}`
            ),
          }
        }
        if (
          operation.replacementTermId.trim().length === 0 ||
          operation.replacementTermId === operation.termId
        ) {
          return {
            expression,
            changed: false,
            diagnostic: diagnostic(
              'invalid_taxonomy_replacement',
              'A retired taxonomy term must use a distinct non-empty replacement',
              `filter.${condition.field}`
            ),
          }
        }
        const transformed = mapFilterValueTerms(
          condition.value,
          new Map([[operation.termId, operation.replacementTermId]])
        )
        const minimumMatchDiagnostic = taxonomyMinimumMatchDiagnostic(
          transformed.value,
          condition.field
        )
        if (minimumMatchDiagnostic) {
          return {
            expression,
            changed: false,
            diagnostic: minimumMatchDiagnostic,
          }
        }
        condition = withConditionValue(condition, transformed.value)
        changed ||= transformed.changed
      }
      break
    case 'taxonomy_split':
      if (
        condition.field === operation.field &&
        filterValueContainsTerm(condition.value, operation.termId)
      ) {
        return {
          expression,
          changed: false,
          diagnostic: diagnostic(
            'ambiguous_taxonomy_split',
            `Taxonomy term ${operation.termId} splits into ${operation.replacementTermIds.join(', ')}`,
            `filter.${condition.field}`
          ),
        }
      }
      break
  }

  return { expression: condition, changed, diagnostic: null }
}

function applyStep(
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
      const sort = current.sort.map((entry: { field: string; direction: string }) =>
        entry.field === operation.fromField ? { ...entry, field: operation.toField } : entry
      )
      const projection = current.projection.map((field: string) =>
        field === operation.fromField ? operation.toField : field
      )
      const semanticReferenceChanged =
        sort.some((entry: { field: string; direction: string }, index: number) => entry !== current.sort[index]) ||
        projection.some((field: string, index: number) => field !== current.projection[index])
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

function canonicalSource(
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
