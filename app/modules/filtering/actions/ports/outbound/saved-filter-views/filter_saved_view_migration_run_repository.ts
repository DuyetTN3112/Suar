import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'

export type FilterSavedViewMigrationOutcome =
  | 'pending'
  | 'compatible'
  | 'migrated'
  | 'requires_repair'
  | 'blocked'

export interface FilterSavedViewMigrationRunRecord {
  readonly id: string
  readonly savedViewId: string
  readonly migrationId: string
  readonly fromVersion: number
  readonly toVersion: number
  readonly inputChecksum: string
  readonly outputChecksum: string | null
  readonly outcome: FilterSavedViewMigrationOutcome
  readonly atomicPayload: unknown | null
  readonly diagnosticCode: string | null
}

export interface FilterSavedViewMigrationRunRepository {
  findByIdempotency(input: {
    readonly savedViewId: string
    readonly migrationId: string
    readonly inputChecksum: string
  }, transaction?: FilterTransaction): Promise<FilterSavedViewMigrationRunRecord | null>
  record(input: {
    readonly savedViewId: string
    readonly migrationId: string
    readonly fromVersion: number
    readonly toVersion: number
    readonly inputChecksum: string
    readonly outputChecksum: string | null
    readonly outcome: FilterSavedViewMigrationOutcome
    readonly atomicPayload: unknown | null
    readonly diagnosticCode: string | null
    readonly now: string
  }, transaction: FilterTransaction): Promise<FilterSavedViewMigrationRunRecord>
}
