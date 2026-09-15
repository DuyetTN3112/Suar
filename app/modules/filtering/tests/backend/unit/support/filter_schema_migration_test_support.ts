import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  migrateFilterSchema as executeFilterSchemaMigration,
  type FilterSchemaMigrationInput,
  type FilterSchemaMigrationStep,
} from '#modules/filtering/domain/filtering-core/filter_schema_migration'
import {
  parseSavedFilterSemanticState,
  type SavedFilterSemanticState,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'

export const migrateFilterSchema = (input: Parameters<typeof executeFilterSchemaMigration>[0]) =>
  executeFilterSchemaMigration(input, new NodeFilterHashGenerator())

export function condition(field: string, operator: string, value: string): FilterExpression {
  return {
    kind: 'condition',
    field,
    operator,
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value },
  }
}

export function semanticState(filter: FilterExpression): SavedFilterSemanticState {
  return { filter, textQuery: null, sort: [], projection: [] }
}

export function migrationInput(
  migrations: readonly FilterSchemaMigrationStep[],
  overrides: Partial<FilterSchemaMigrationInput> = {}
): FilterSchemaMigrationInput {
  return {
    contextKey: 'work_item.discovery',
    contextOwner: 'tasks',
    fromVersion: 1,
    toVersion: 2,
    payload: semanticState(condition('legacy_status', 'eq', 'open')),
    inputChecksum: null,
    migrations,
    forwardReaders: [],
    ...overrides,
  }
}

export function successfulPayload(
  result: ReturnType<typeof migrateFilterSchema>
): SavedFilterSemanticState {
  if (result.atomicPayload === null) {
    throw new Error(`Expected atomic payload, received ${result.outcome}`)
  }
  return parseSavedFilterSemanticState(result.atomicPayload.payloadJson)
}
