import type { FilterMigrationResult } from '#modules/filtering/domain/filtering-core/filter_migration_result'
import type { SavedFilterSemanticState } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'

export interface FilterSchemaMigrationProviderInput {
  readonly contextKey: string
  readonly contextOwner: string
  readonly fromVersion: number
  readonly toVersion: number
  readonly payload: SavedFilterSemanticState | string
  readonly inputChecksum: string | null
}

export interface FilterSchemaMigrationProvider {
  migrate(input: FilterSchemaMigrationProviderInput): Promise<FilterMigrationResult>
}
