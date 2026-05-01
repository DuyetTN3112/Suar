import { isDeepStrictEqual } from 'node:util'

import db from '@adonisjs/lucid/services/db'

import type {
  LegacyAccomplishmentBackfillCheckpoint,
  LegacyAccomplishmentBackfillCheckpointStore,
  LegacyAccomplishmentBackfillWriter,
  LegacyAccomplishmentSource,
  LegacyBackfillOutcome,
} from '#modules/accomplishments/actions/commands/legacy-backfill/run_legacy_accomplishment_backfill_command'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

const RUNS_TABLE = 'accomplishment_legacy_backfill_runs'
const FACTS_TABLE = 'accomplishment_legacy_backfill_facts'

interface RunRow {
  scope_key: string
  cursor: string | null
  processed_source_ids: readonly string[] | string
}

interface FactRow {
  source_id: string
  source_payload: LegacyAccomplishmentSource | string
  outcome_payload: LegacyBackfillOutcome | string
}

function parseJson<T>(value: T | string, field: string): T {
  try {
    return typeof value === 'string' ? (JSON.parse(value) as T) : value
  } catch {
    throw new PersistedDataIntegrityException(`Legacy backfill ${field} is corrupt`, {})
  }
}

function mapRun(row: RunRow): LegacyAccomplishmentBackfillCheckpoint {
  const processedSourceIds = parseJson<unknown>(row.processed_source_ids, 'checkpoint')
  if (
    !Array.isArray(processedSourceIds) ||
    processedSourceIds.some((sourceId): sourceId is unknown => typeof sourceId !== 'string')
  ) {
    throw new PersistedDataIntegrityException('Legacy backfill checkpoint is corrupt', {})
  }
  return {
    scopeKey: row.scope_key,
    cursor: row.cursor,
    processedSourceIds,
  }
}

export default class LucidLegacyAccomplishmentBackfillCheckpointStore
  implements LegacyAccomplishmentBackfillCheckpointStore
{
  async load(scopeKey: string): Promise<LegacyAccomplishmentBackfillCheckpoint | null> {
    const row = (await db.from(RUNS_TABLE).where('scope_key', scopeKey).first()) as
      | RunRow
      | undefined
    return row ? mapRun(row) : null
  }

  async save(checkpoint: LegacyAccomplishmentBackfillCheckpoint): Promise<void> {
    await db
      .table(RUNS_TABLE)
      .insert({
        scope_key: checkpoint.scopeKey,
        cursor: checkpoint.cursor,
        processed_source_ids: JSON.stringify(checkpoint.processedSourceIds),
      })
      .onConflict('scope_key')
      .merge({
        cursor: checkpoint.cursor,
        processed_source_ids: JSON.stringify(checkpoint.processedSourceIds),
        updated_at: new Date().toISOString(),
      })
  }
}

export class LucidLegacyAccomplishmentBackfillWriter implements LegacyAccomplishmentBackfillWriter {
  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  async persistRetrospective(input: {
    readonly source: LegacyAccomplishmentSource
    readonly outcome: LegacyBackfillOutcome
  }): Promise<void> {
    if (
      !input.outcome.writable ||
      input.outcome.classification !== 'retrospective_user_confirmed' ||
      input.source.sourceId !== input.outcome.sourceId
    ) {
      throw new InvariantViolationException(
        'Legacy backfill writer accepts only matching retrospective outcomes'
      )
    }

    await db
      .table(FACTS_TABLE)
      .insert({
        source_id: input.source.sourceId,
        user_id: input.source.userId,
        task_assignment_id: input.source.taskAssignmentId,
        task_id: input.source.taskId,
        classification: input.outcome.classification,
        source_payload: JSON.stringify(input.source),
        outcome_payload: JSON.stringify(input.outcome),
        created_at: this.now(),
        updated_at: this.now(),
      })
      .onConflict('source_id')
      .ignore()

    const row = (await db
      .from(FACTS_TABLE)
      .where('source_id', input.source.sourceId)
      .first()) as FactRow | undefined
    if (!row) {
      throw new PersistedDataIntegrityException('Legacy backfill fact write was not durable', {})
    }
    const persistedSource = parseJson<LegacyAccomplishmentSource>(row.source_payload, 'fact')
    const persistedOutcome = parseJson<LegacyBackfillOutcome>(row.outcome_payload, 'fact')
    if (
      !isDeepStrictEqual(persistedSource, input.source) ||
      !isDeepStrictEqual(persistedOutcome, input.outcome)
    ) {
      throw new InvariantViolationException('Legacy backfill source identity collision')
    }
  }
}
