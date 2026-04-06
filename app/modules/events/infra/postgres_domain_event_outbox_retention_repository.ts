import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  DomainEventOutboxRetentionRepository,
  type DomainEventOutboxRetentionDueCounts,
  type DomainEventOutboxRetentionTransaction,
} from '#modules/events/actions/ports/outbound/domain_event_outbox_retention_repository'

function countFrom(result: unknown): number {
  const value = (result as { rows?: Array<{ count?: number | string }> }).rows?.[0]?.count
  return Number(value ?? 0)
}

function affectedRows(result: unknown): number {
  return (result as { rows?: unknown[] }).rows?.length ?? 0
}

async function executeCountQuery(sql: string, bindings: unknown[]): Promise<unknown> {
  const result: unknown = await db.rawQuery(sql, bindings)
  return result
}

export class PostgresDomainEventOutboxRetentionRepository
  extends DomainEventOutboxRetentionRepository
{
  constructor() {
    super()
  }

  async countDue(input: {
    processedBefore: Date
    replayHistoryBefore: Date
    cap: number
  }): Promise<DomainEventOutboxRetentionDueCounts> {
    const [processed, replayHistory] = await Promise.all([
      executeCountQuery(
        `
          SELECT COUNT(*)::integer AS count
          FROM (
            SELECT 1
            FROM domain_event_outbox
            WHERE status = 'processed'
              AND processed_at < ?
            ORDER BY processed_at ASC, sequence ASC
            LIMIT ?
          ) AS bounded
        `,
        [input.processedBefore, input.cap]
      ),
      executeCountQuery(
        `
          SELECT COUNT(*)::integer AS count
          FROM (
            SELECT 1
            FROM domain_event_outbox_replay_history
            WHERE replayed_at < ?
            ORDER BY replayed_at ASC, id ASC
            LIMIT ?
          ) AS bounded
        `,
        [input.replayHistoryBefore, input.cap]
      ),
    ])
    return {
      processedRows: countFrom(processed),
      replayHistoryRows: countFrom(replayHistory),
    }
  }

  async purgeProcessed(
    processedBefore: Date,
    limit: number,
    transaction: DomainEventOutboxRetentionTransaction
  ): Promise<number> {
    const trx = transaction as TransactionClientContract
    const result: unknown = await trx.rawQuery(
      `
        WITH candidates AS (
          SELECT id
          FROM domain_event_outbox
          WHERE status = 'processed'
            AND processed_at < ?
          ORDER BY processed_at ASC, sequence ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ?
        )
        DELETE FROM domain_event_outbox AS outbox
        USING candidates
        WHERE outbox.id = candidates.id
          AND outbox.status = 'processed'
          AND outbox.processed_at < ?
        RETURNING outbox.id
      `,
      [processedBefore, limit, processedBefore]
    )
    return affectedRows(result)
  }

  async purgeReplayHistory(
    replayHistoryBefore: Date,
    limit: number,
    transaction: DomainEventOutboxRetentionTransaction
  ): Promise<number> {
    const trx = transaction as TransactionClientContract
    const result: unknown = await trx.rawQuery(
      `
        WITH candidates AS (
          SELECT id
          FROM domain_event_outbox_replay_history
          WHERE replayed_at < ?
          ORDER BY replayed_at ASC, id ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ?
        )
        DELETE FROM domain_event_outbox_replay_history AS history
        USING candidates
        WHERE history.id = candidates.id
          AND history.replayed_at < ?
        RETURNING history.id
      `,
      [replayHistoryBefore, limit, replayHistoryBefore]
    )
    return affectedRows(result)
  }
}
