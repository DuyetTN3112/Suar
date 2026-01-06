import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import type {
  NotificationRetentionProjectionTarget,
  NotificationRetentionRepository,
  NotificationRetentionStatus,
  NotificationTombstonePurgePlan,
} from '#modules/notifications/actions/ports/outbound/notification_retention_repository'
import { NotificationCanonicalStateError } from '#modules/notifications/domain/notification_contract_errors'
import {
  NOTIFICATION_RETIRED_INDEX_GRACE_MS,
  NOTIFICATION_TOMBSTONE_RETENTION_MS,
} from '#modules/notifications/domain/notification_retention_policy'
import {
  acquireNotificationProjectionCutoverFence,
  acquireNotificationProjectionWriterFence,
} from '#modules/notifications/infra/repositories/notification_projection_fence'

interface ExpiredNotificationRow {
  id: string
  event_id: string
  user_id: string
  is_read: boolean
  revision: number | string
}

interface RecipientStateRow {
  recipient_id: string
  unread_count: number | string
  revision: number | string
}

export type {
  NotificationRetentionProjectionTarget,
  NotificationRetentionTombstone,
  NotificationTombstonePurgePlan,
} from '#modules/notifications/actions/ports/outbound/notification_retention_repository'

const ACTIVE_PROJECTION_RUN_STATUSES = [
  'initialized',
  'backfilling',
  'catching_up',
  'reconciling',
  'ready',
  'cutting_over',
]

function rowCount(result: unknown): number {
  const row = (result as { rows?: Array<{ count: number | string }> }).rows?.[0]
  return Number(row?.count ?? 0)
}

async function expireOneRecipient(now: Date, limit: number): Promise<number> {
  return db.transaction(async (trx) => {
    await acquireNotificationProjectionWriterFence(trx)
    const stateResult: unknown = await trx.rawQuery(
      `
        SELECT state.recipient_id, state.unread_count, state.revision
        FROM notification_recipient_states AS state
        WHERE EXISTS (
          SELECT 1
          FROM notifications AS notification
          WHERE notification.user_id = state.recipient_id
            AND notification.retention_until <= ?
        )
        ORDER BY state.recipient_id
        FOR UPDATE OF state SKIP LOCKED
        LIMIT 1
      `,
      [now]
    )
    const state = (stateResult as { rows?: RecipientStateRow[] }).rows?.[0]
    if (!state) {
      return 0
    }

    const rows = (await trx
      .from('notifications')
      .select('id', 'event_id', 'user_id', 'is_read', 'revision')
      .where('user_id', state.recipient_id)
      .where('retention_until', '<=', now)
      .orderBy('id', 'asc')
      .limit(limit)
      .forUpdate()
      .skipLocked()) as ExpiredNotificationRow[]
    if (rows.length === 0) {
      return 0
    }

    const projections = rows.map((row) => ({
      notificationId: row.id,
      sourceEventId: row.event_id,
      revision: Number(row.revision) + 1,
    }))
    await trx.table('notification_tombstones').insert(
      projections.map((projection) => ({
        notification_id: projection.notificationId,
        recipient_id: state.recipient_id,
        final_revision: projection.revision,
        deleted_at: now,
        purge_after: new Date(now.getTime() + NOTIFICATION_TOMBSTONE_RETENTION_MS),
      }))
    )
    await trx
      .from('notification_acceptance_ledger')
      .whereIn(
        'notification_id',
        rows.map((row) => row.id)
      )
      .update({
        terminal_state: 'deleted',
        terminal_at: now,
      })

    const unreadRemoved = rows.filter((row) => !row.is_read).length
    const recipientRevision = Number(state.revision) + 1
    const unreadCount = Math.max(0, Number(state.unread_count) - unreadRemoved)
    const updated = await trx
      .from('notification_recipient_states')
      .where('recipient_id', state.recipient_id)
      .where('revision', Number(state.revision))
      .update({
        unread_count: unreadCount,
        revision: recipientRevision,
        updated_at: now,
      })
    if (Number(updated) !== 1) {
      throw new NotificationCanonicalStateError(
        `Notification recipient state changed without its retention lock for ${state.recipient_id}`
      )
    }

    const operationId = randomUUID()
    await trx.table('notification_outbox').insert([
      ...projections.map((projection) => ({
        notification_id: projection.notificationId,
        operation_id: operationId,
        source_event_id: projection.sourceEventId,
        event_kind: 'notification_tombstone',
        revision: projection.revision,
        projection_revision: projection.revision,
        destination: 'feed_search',
        partition_key: projection.notificationId,
        recipient_id: state.recipient_id,
        recipient_state_revision: recipientRevision,
        payload: {
          notificationId: projection.notificationId,
          recipientId: state.recipient_id,
          revision: projection.revision,
          deleted: true,
        },
      })),
      {
        notification_id: null,
        operation_id: operationId,
        source_event_id: randomUUID(),
        event_kind: 'unread_absolute',
        revision: recipientRevision,
        projection_revision: recipientRevision,
        destination: 'unread_cache',
        partition_key: state.recipient_id,
        recipient_id: state.recipient_id,
        recipient_state_revision: recipientRevision,
        payload: {
          recipientId: state.recipient_id,
          count: unreadCount,
          revision: recipientRevision,
        },
      },
    ])
    await trx
      .from('notifications')
      .where('user_id', state.recipient_id)
      .whereIn(
        'id',
        rows.map((row) => row.id)
      )
      .delete()

    return rows.length
  })
}

export class PostgresNotificationRetentionRepository implements NotificationRetentionRepository {
  async operationalStatus(
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

  async expireCanonicalBatch(now: Date, limit: number): Promise<number> {
    let expired = 0
    while (expired < limit) {
      const count = await expireOneRecipient(now, limit - expired)
      if (count === 0) {
        break
      }
      expired += count
    }
    return expired
  }

  async purgeProcessedOutbox(before: Date, limit: number): Promise<number> {
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

  async purgeCompletedFanoutJobs(before: Date, limit: number): Promise<number> {
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

  async tombstonePurgePlan(now: Date, limit: number): Promise<NotificationTombstonePurgePlan> {
    const activeRun = (await db
      .from('notification_projection_runs')
      .select('id')
      .whereIn('status', ACTIVE_PROJECTION_RUN_STATUSES)
      .first()) as { id: string } | undefined
    if (activeRun) {
      return { tombstones: [], targets: [] }
    }

    const rows = (await db
      .from('notification_tombstones as tombstone')
      .select('tombstone.notification_id', 'tombstone.final_revision')
      .where('tombstone.purge_after', '<=', now)
      .whereNotNull('tombstone.projection_completed_at')
      .whereNotExists((query) => {
        void query
          .from('notification_outbox as outbox')
          .select(db.raw('1'))
          .whereColumn('outbox.notification_id', 'tombstone.notification_id')
      })
      .orderBy('tombstone.notification_id', 'asc')
      .limit(limit)) as Array<{
      notification_id: string
      final_revision: number | string
    }>
    if (rows.length === 0) {
      return { tombstones: [], targets: [] }
    }

    return {
      tombstones: rows.map((row) => ({
        notificationId: row.notification_id,
        finalRevision: Number(row.final_revision),
      })),
      targets: await this.retainedProjectionTargets(),
    }
  }

  async confirmTombstonePurge(input: {
    now: Date
    notificationIds: string[]
    targetIds: string[]
  }): Promise<number> {
    if (input.notificationIds.length === 0) {
      return 0
    }
    return db.transaction(async (trx) => {
      await acquireNotificationProjectionCutoverFence(trx)
      const activeRun = (await trx
        .from('notification_projection_runs')
        .select('id')
        .whereIn('status', ACTIVE_PROJECTION_RUN_STATUSES)
        .first()) as { id: string } | undefined
      if (activeRun) {
        return 0
      }

      const targets = await this.retainedProjectionTargets(trx)
      const expectedTargetIds = [...new Set(input.targetIds)].sort()
      const actualTargetIds = targets.map((target) => target.id).sort()
      if (
        expectedTargetIds.length !== actualTargetIds.length ||
        expectedTargetIds.some((id, index) => id !== actualTargetIds[index])
      ) {
        return 0
      }

      const rows = (await trx
        .from('notification_tombstones as tombstone')
        .select('tombstone.notification_id')
        .whereIn('tombstone.notification_id', input.notificationIds)
        .where('tombstone.purge_after', '<=', input.now)
        .whereNotNull('tombstone.projection_completed_at')
        .whereNotExists((query) => {
          void query
            .from('notification_outbox as outbox')
            .select(trx.raw('1'))
            .whereColumn('outbox.notification_id', 'tombstone.notification_id')
        })
        .orderBy('tombstone.notification_id', 'asc')
        .forUpdate()) as Array<{ notification_id: string }>
      if (rows.length === 0) {
        return 0
      }
      const ids = rows.map((row) => row.notification_id)
      await trx
        .from('notification_acceptance_ledger')
        .whereIn('notification_id', ids)
        .where('terminal_state', 'deleted')
        .update({
          terminal_state: 'purged',
          terminal_at: input.now,
        })
      const deleted = await trx
        .from('notification_tombstones')
        .whereIn('notification_id', ids)
        .delete()
      return Number(deleted)
    })
  }

  async retireExpiredProjectionTargets(now: Date, limit: number): Promise<number> {
    return db.transaction(async (trx) => {
      await acquireNotificationProjectionCutoverFence(trx)
      const activeRun = (await trx
        .from('notification_projection_runs')
        .select('id')
        .whereIn('status', ACTIVE_PROJECTION_RUN_STATUSES)
        .first()) as { id: string } | undefined
      if (activeRun) {
        return 0
      }

      const result: unknown = await trx.rawQuery(
        `
          WITH candidates AS (
            SELECT target.id
            FROM notification_projection_targets AS target
            WHERE target.status = 'rollback'
              AND target.required_until <= ?
            ORDER BY target.required_until, target.id
            FOR UPDATE OF target SKIP LOCKED
            LIMIT ?
          ),
          retired AS (
            UPDATE notification_projection_targets AS target
            SET
              status = 'retired',
              rollback_eligible = false,
              retired_at = ?,
              updated_at = ?
            FROM candidates
            WHERE target.id = candidates.id
            RETURNING target.id
          )
          SELECT COUNT(*) AS count FROM retired
        `,
        [now, limit, now, now]
      )
      return rowCount(result)
    })
  }

  async retiredProjectionIndexPlan(
    now: Date,
    limit: number
  ): Promise<NotificationRetentionProjectionTarget[]> {
    const activeRun = (await db
      .from('notification_projection_runs')
      .select('id')
      .whereIn('status', ACTIVE_PROJECTION_RUN_STATUSES)
      .first()) as { id: string } | undefined
    if (activeRun) {
      return []
    }

    const retiredBefore = new Date(now.getTime() - NOTIFICATION_RETIRED_INDEX_GRACE_MS)
    const rows = (await db
      .from('notification_projection_targets')
      .select('id', 'physical_index')
      .where('status', 'retired')
      .where('retired_at', '<=', retiredBefore)
      .whereNull('physical_deleted_at')
      .orderBy('retired_at', 'asc')
      .orderBy('id', 'asc')
      .limit(limit)) as Array<{ id: string; physical_index: string }>
    return rows.map((row) => ({
      id: row.id,
      physicalIndex: row.physical_index,
    }))
  }

  async confirmRetiredProjectionIndexDeletion(input: {
    now: Date
    targetId: string
    physicalIndex: string
  }): Promise<boolean> {
    return db.transaction(async (trx) => {
      await acquireNotificationProjectionCutoverFence(trx)
      const activeRun = (await trx
        .from('notification_projection_runs')
        .select('id')
        .whereIn('status', ACTIVE_PROJECTION_RUN_STATUSES)
        .first()) as { id: string } | undefined
      if (activeRun) {
        return false
      }

      const retiredBefore = new Date(input.now.getTime() - NOTIFICATION_RETIRED_INDEX_GRACE_MS)
      const changed = await trx
        .from('notification_projection_targets')
        .where('id', input.targetId)
        .where('physical_index', input.physicalIndex)
        .where('status', 'retired')
        .where('retired_at', '<=', retiredBefore)
        .whereNull('physical_deleted_at')
        .update({
          physical_deleted_at: input.now,
          updated_at: input.now,
        })
      return Number(changed) === 1
    })
  }

  async purgeTerminalLedger(before: Date, limit: number): Promise<number> {
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

  private async retainedProjectionTargets(
    connection: Pick<typeof db, 'from'> = db
  ): Promise<NotificationRetentionProjectionTarget[]> {
    const rows = (await connection
      .from('notification_projection_targets')
      .select('id', 'physical_index')
      .whereNull('physical_deleted_at')
      .orderBy('id', 'asc')) as Array<{ id: string; physical_index: string }>
    return rows.map((row) => ({
      id: row.id,
      physicalIndex: row.physical_index,
    }))
  }
}
