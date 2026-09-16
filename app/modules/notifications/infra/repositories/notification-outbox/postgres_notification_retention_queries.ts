import db from '@adonisjs/lucid/services/db'

import type { NotificationRetentionStatus } from '#modules/notifications/actions/ports/outbound/notification_retention_repository'

export const ACTIVE_PROJECTION_RUN_STATUSES = [
  'initialized',
  'backfilling',
  'catching_up',
  'reconciling',
  'ready',
  'cutting_over',
]

export function rowCount(result: unknown): number {
  const row = (result as { rows?: Array<{ count: number | string }> }).rows?.[0]
  return Number(row?.count ?? 0)
}

export async function queryOperationalStatus(
  now: Date,
  processedBefore: Date,
  retiredBefore: Date
): Promise<NotificationRetentionStatus> {
  const result: unknown = await db.rawQuery(
    `
      SELECT
        (SELECT COUNT(*) FROM notifications WHERE retention_until <= ?) AS due_notifications,
        (
          SELECT COUNT(*)
          FROM notification_outbox AS outbox
          WHERE outbox.status IN ('processed', 'discarded')
            AND outbox.processed_at <= ?
            AND (
              outbox.status = 'discarded'
              OR outbox.destination = 'unread_cache'
              OR (
                outbox.destination = 'feed_search'
                AND EXISTS (
                  SELECT 1
                  FROM notification_projection_deliveries AS delivery
                  WHERE delivery.outbox_id = outbox.id
                )
                AND NOT EXISTS (
                  SELECT 1
                  FROM notification_projection_deliveries AS delivery
                  WHERE delivery.outbox_id = outbox.id
                    AND delivery.status <> 'processed'
                )
              )
            )
        ) AS eligible_processed_outbox,
        (
          SELECT COUNT(*)
          FROM notification_fanout_jobs
          WHERE status = 'completed'
            AND completed_at <= ?
            AND processed_count = target_count
            AND dead_letter_count = 0
        ) AS eligible_completed_fanout_jobs,
        (
          SELECT COUNT(*) FROM notification_outbox WHERE status = 'dead_letter'
        ) AS outbox_dead_letters,
        (
          SELECT COUNT(*) FROM notification_fanout_targets WHERE status = 'dead_letter'
        ) AS fanout_dead_letters,
        (
          SELECT COUNT(*)
          FROM notification_tombstones
          WHERE purge_after <= ?
            AND projection_completed_at IS NULL
        ) AS tombstones_awaiting_projection_proof,
        (
          SELECT COUNT(*)
          FROM notification_projection_targets
          WHERE status = 'rollback'
            AND required_until <= ?
        ) AS expired_rollback_targets,
        (
          SELECT COUNT(*)
          FROM notification_projection_targets
          WHERE status = 'retired'
            AND retired_at <= ?
            AND physical_deleted_at IS NULL
        ) AS retired_indices_awaiting_deletion
    `,
    [now, processedBefore, processedBefore, now, now, retiredBefore]
  )
  const row = (result as { rows?: Array<Record<string, number | string>> }).rows?.[0]
  return {
    dueNotifications: Number(row?.['due_notifications'] ?? 0),
    eligibleProcessedOutbox: Number(row?.['eligible_processed_outbox'] ?? 0),
    eligibleCompletedFanoutJobs: Number(row?.['eligible_completed_fanout_jobs'] ?? 0),
    outboxDeadLetters: Number(row?.['outbox_dead_letters'] ?? 0),
    fanoutDeadLetters: Number(row?.['fanout_dead_letters'] ?? 0),
    tombstonesAwaitingProjectionProof: Number(row?.['tombstones_awaiting_projection_proof'] ?? 0),
    expiredRollbackTargets: Number(row?.['expired_rollback_targets'] ?? 0),
    retiredIndicesAwaitingDeletion: Number(row?.['retired_indices_awaiting_deletion'] ?? 0),
  }
}

export async function queryPurgeProcessedOutbox(before: Date, limit: number): Promise<number> {
  const result: unknown = await db.rawQuery(
    `
      WITH candidates AS (
        SELECT
          outbox.id,
          outbox.notification_id,
          outbox.event_kind,
          outbox.processed_at
        FROM notification_outbox AS outbox
        WHERE outbox.status IN ('processed', 'discarded')
          AND outbox.processed_at <= ?
          AND (
            outbox.status = 'discarded'
            OR outbox.destination = 'unread_cache'
            OR (
              outbox.destination = 'feed_search'
              AND EXISTS (
                SELECT 1
                FROM notification_projection_deliveries AS delivery
                WHERE delivery.outbox_id = outbox.id
              )
              AND NOT EXISTS (
                SELECT 1
                FROM notification_projection_deliveries AS delivery
                WHERE delivery.outbox_id = outbox.id
                  AND delivery.status <> 'processed'
              )
            )
          )
        ORDER BY outbox.sequence
        FOR UPDATE OF outbox SKIP LOCKED
        LIMIT ?
      ),
      projection_proofs AS (
        UPDATE notification_tombstones AS tombstone
        SET projection_completed_at = GREATEST(
          COALESCE(tombstone.projection_completed_at, '-infinity'::timestamptz),
          candidates.processed_at
        )
        FROM candidates
        WHERE candidates.event_kind = 'notification_tombstone'
          AND candidates.notification_id = tombstone.notification_id
        RETURNING tombstone.notification_id
      ),
      deleted AS (
        DELETE FROM notification_outbox AS outbox
        USING candidates
        WHERE outbox.id = candidates.id
        RETURNING outbox.id
      )
      SELECT COUNT(*) AS count FROM deleted
    `,
    [before, limit]
  )
  return rowCount(result)
}

export async function queryPurgeCompletedFanoutJobs(before: Date, limit: number): Promise<number> {
  const result: unknown = await db.rawQuery(
    `
      WITH candidates AS (
        SELECT job.id
        FROM notification_fanout_jobs AS job
        WHERE job.status = 'completed'
          AND job.completed_at <= ?
          AND job.processed_count = job.target_count
          AND job.dead_letter_count = 0
        ORDER BY job.sequence
        FOR UPDATE OF job SKIP LOCKED
        LIMIT ?
      ),
      deleted AS (
        DELETE FROM notification_fanout_jobs AS job
        USING candidates
        WHERE job.id = candidates.id
        RETURNING job.id
      )
      SELECT COUNT(*) AS count FROM deleted
    `,
    [before, limit]
  )
  return rowCount(result)
}

export async function queryPurgeTerminalLedger(before: Date, limit: number): Promise<number> {
  const result: unknown = await db.rawQuery(
    `
      WITH candidates AS (
        SELECT ledger.event_id, ledger.recipient_id
        FROM notification_acceptance_ledger AS ledger
        WHERE ledger.terminal_state = 'purged'
          AND ledger.occurred_at <= ?
          AND NOT EXISTS (
            SELECT 1 FROM notification_tombstones AS tombstone
            WHERE tombstone.notification_id = ledger.notification_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM notifications AS notification
            WHERE notification.id = ledger.notification_id
          )
        ORDER BY ledger.occurred_at, ledger.event_id, ledger.recipient_id
        FOR UPDATE OF ledger SKIP LOCKED
        LIMIT ?
      ),
      deleted AS (
        DELETE FROM notification_acceptance_ledger AS ledger
        USING candidates
        WHERE ledger.event_id = candidates.event_id
          AND ledger.recipient_id = candidates.recipient_id
        RETURNING ledger.event_id
      )
      SELECT COUNT(*) AS count FROM deleted
    `,
    [before, limit]
  )
  return rowCount(result)
}
