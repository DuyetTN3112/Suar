import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  ErrorEventRetentionRepository,
  type ErrorEventRetentionTransaction,
} from '#modules/errors/actions/ports/outbound/error-event-retention/error_event_retention_repository'

function databaseClient(trx?: ErrorEventRetentionTransaction) {
  return (trx as TransactionClientContract | undefined) ?? db
}

function rowsFromRawResult(result: unknown): unknown[] {
  if (
    typeof result !== 'object' ||
    result === null ||
    !('rows' in result) ||
    !Array.isArray(result.rows)
  ) {
    throw new TypeError('PostgreSQL retention query returned an invalid result')
  }
  return result.rows
}

export class PostgresErrorEventRetentionRepository extends ErrorEventRetentionRepository {
  constructor() {
    super()
  }

  async countDue(
    before: Date,
    cap: number,
    trx?: ErrorEventRetentionTransaction
  ): Promise<number> {
    const result: unknown = await databaseClient(trx).rawQuery(
      `
        SELECT count(*)::integer AS count
        FROM (
          SELECT id
          FROM error_events
          WHERE created_at < ?
          ORDER BY created_at, id
          LIMIT ?
        ) AS bounded_due
      `,
      [before, cap]
    )
    const firstRow = rowsFromRawResult(result)[0]
    if (typeof firstRow !== 'object' || firstRow === null || !('count' in firstRow)) {
      throw new TypeError('PostgreSQL retention count query returned an invalid row')
    }
    return Number(firstRow.count)
  }

  async purgeDue(
    before: Date,
    limit: number,
    trx?: ErrorEventRetentionTransaction
  ): Promise<number> {
    const result: unknown = await databaseClient(trx).rawQuery(
      `
        WITH candidates AS (
          SELECT id
          FROM error_events
          WHERE created_at < ?
          ORDER BY created_at, id
          FOR UPDATE SKIP LOCKED
          LIMIT ?
        )
        DELETE FROM error_events AS error_event
        USING candidates
        WHERE error_event.id = candidates.id
        RETURNING error_event.id
      `,
      [before, limit]
    )
    return rowsFromRawResult(result).length
  }
}
