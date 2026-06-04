import db from '@adonisjs/lucid/services/db'

import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import type {
  FilterSavedViewMigrationOutcome,
  FilterSavedViewMigrationRunRecord,
  FilterSavedViewMigrationRunRepository,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_migration_run_repository'

type DbClient = typeof db
type Row = Record<string, unknown>

function clientFor(transaction?: FilterTransaction): DbClient {
  return (transaction ?? db) as DbClient
}

function mapRow(row: Row): FilterSavedViewMigrationRunRecord {
  return {
    id: String(row.id),
    savedViewId: String(row.saved_view_id),
    migrationId: String(row.migration_id),
    fromVersion: Number(row.from_version),
    toVersion: Number(row.to_version),
    inputChecksum: String(row.input_checksum),
    outputChecksum: stringOrNull(row.output_checksum),
    outcome: String(row.outcome) as FilterSavedViewMigrationOutcome,
    atomicPayload: row.atomic_payload ?? null,
    diagnosticCode: stringOrNull(row.diagnostic_code),
  }
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export class PostgresFilterSavedViewMigrationRunRepository
  implements FilterSavedViewMigrationRunRepository {
  async findByIdempotency(
    input: Parameters<FilterSavedViewMigrationRunRepository['findByIdempotency']>[0],
    transaction?: FilterTransaction
  ): Promise<FilterSavedViewMigrationRunRecord | null> {
    const row = (await clientFor(transaction)
      .from('filter_saved_view_migration_runs')
      .where('saved_view_id', input.savedViewId)
      .where('migration_id', input.migrationId)
      .where('input_checksum', input.inputChecksum)
      .first()) as Row | undefined
    return row ? mapRow(row) : null
  }

  async record(
    input: Parameters<FilterSavedViewMigrationRunRepository['record']>[0],
    transaction: FilterTransaction
  ): Promise<FilterSavedViewMigrationRunRecord> {
    const client = clientFor(transaction)
    await client
      .table('filter_saved_view_migration_runs')
      .insert({
        saved_view_id: input.savedViewId,
        migration_id: input.migrationId,
        from_version: input.fromVersion,
        to_version: input.toVersion,
        input_checksum: input.inputChecksum,
        output_checksum: input.outputChecksum,
        outcome: input.outcome,
        atomic_payload: input.atomicPayload,
        diagnostic_code: input.diagnosticCode,
        started_at: input.now,
        completed_at: input.now,
      })
      .onConflict(['saved_view_id', 'migration_id', 'input_checksum'])
      .merge({
        output_checksum: input.outputChecksum,
        outcome: input.outcome,
        atomic_payload: input.atomicPayload,
        diagnostic_code: input.diagnosticCode,
        completed_at: input.now,
      })

    const row = (await client
      .from('filter_saved_view_migration_runs')
      .where('saved_view_id', input.savedViewId)
      .where('migration_id', input.migrationId)
      .where('input_checksum', input.inputChecksum)
      .first()) as Row | undefined
    if (!row) throw new Error('filter_saved_view_migration_run_record_failed')
    return mapRow(row)
  }
}

export default PostgresFilterSavedViewMigrationRunRepository
