import db from '@adonisjs/lucid/services/db'

import { expireOneRecipient } from './postgres_notification_retention_canonical.js'
import {
  ACTIVE_PROJECTION_RUN_STATUSES,
  queryOperationalStatus,
  queryPurgeCompletedFanoutJobs,
  queryPurgeProcessedOutbox,
  queryPurgeTerminalLedger,
  rowCount,
} from './postgres_notification_retention_queries.js'

import type {
  NotificationRetentionProjectionTarget,
  NotificationRetentionRepository,
  NotificationRetentionStatus,
  NotificationTombstonePurgePlan,
} from '#modules/notifications/actions/ports/outbound/notification_retention_repository'
import { NOTIFICATION_RETIRED_INDEX_GRACE_MS } from '#modules/notifications/domain/notification-outbox/notification_retention_policy'
import { acquireNotificationProjectionCutoverFence } from '#modules/notifications/infra/repositories/notification-outbox/notification_projection_fence'


export type {
  NotificationRetentionProjectionTarget,
  NotificationRetentionTombstone,
  NotificationTombstonePurgePlan,
} from '#modules/notifications/actions/ports/outbound/notification_retention_repository'

export class PostgresNotificationRetentionRepository implements NotificationRetentionRepository {
  async operationalStatus(
    now: Date,
    processedBefore: Date,
    retiredBefore: Date
  ): Promise<NotificationRetentionStatus> {
    return queryOperationalStatus(now, processedBefore, retiredBefore)
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
    return queryPurgeProcessedOutbox(before, limit)
  }

  async purgeCompletedFanoutJobs(before: Date, limit: number): Promise<number> {
    return queryPurgeCompletedFanoutJobs(before, limit)
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
    return queryPurgeTerminalLedger(before, limit)
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
