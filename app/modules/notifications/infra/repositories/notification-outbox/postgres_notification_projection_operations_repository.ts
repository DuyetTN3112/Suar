import db from '@adonisjs/lucid/services/db'

import {
  captureProjectionS1,
  completeProjectionBackfill,
  computeProjectionCatchupState,
  fetchActiveBatch,
  fetchTombstoneBatch,
  generateExpectedDocuments,
  recordProjectionBackfillBatch,
} from './postgres_notification_projection_backfill_operations.js'
import {
  assertCompletedProjectionPromotion,
  beginProjectionCutover,
  finalizeProjectionCutover,
  recordProjectionReconciliation,
} from './postgres_notification_projection_cutover_operations.js'
import {
  ACTIVE_REBUILD_STATUSES,
  completeProjectionReconciliation,
  initializeProjectionRebuild,
  initializeProjectionReconciliation,
  notificationProjectionRunQuery,
  planProjectionRebuild,
  reloadNotificationProjectionRun,
  toRun,
  type ProjectionRunRow,
} from './postgres_notification_projection_init_operations.js'
import {
  beginProjectionRollback,
  finalizeProjectionRollback,
  planProjectionRollback,
} from './postgres_notification_projection_rollback_operations.js'

import type {
  CanonicalNotificationProjectionRow,
  NotificationSearchDocument,
  NotificationTombstoneProjectionRow,
} from '#modules/notifications/domain/notification-feed/notification_projection_document'
import type {
  NotificationProjectionCatchupState,
  NotificationProjectionPlan,
  NotificationProjectionRollbackPlan,
  NotificationProjectionRun,
  NotificationProjectionRunStatus,
} from '#modules/notifications/domain/notification-feed/notification_projection_lifecycle'

export class PostgresNotificationProjectionOperationsRepository {
  async plan(): Promise<NotificationProjectionPlan> {
    return planProjectionRebuild()
  }

  async activeRun(): Promise<NotificationProjectionRun | null> {
    const row = (await notificationProjectionRunQuery()
      .where('run.run_kind', 'rebuild')
      .whereIn('run.status', ACTIVE_REBUILD_STATUSES as string[])
      .orderBy('run.started_at', 'desc')
      .first()) as ProjectionRunRow | undefined
    return row ? toRun(row) : null
  }

  async initialize(input: {
    actorId: string
    reason: string
    targetIndex: string
    targetKey: string
  }): Promise<NotificationProjectionRun> {
    return initializeProjectionRebuild(input)
  }

  async initializeReconciliation(input: {
    actorId: string
    reason: string
  }): Promise<NotificationProjectionRun> {
    return initializeProjectionReconciliation(input)
  }

  async completeReconciliation(runId: string, passed: boolean): Promise<void> {
    return completeProjectionReconciliation(runId, passed)
  }

  async setStatus(runId: string, status: NotificationProjectionRunStatus): Promise<void> {
    await db
      .from('notification_projection_runs')
      .where('id', runId)
      .update({ status, updated_at: new Date() })
  }

  async activeBatch(
    afterId: string | null,
    limit: number
  ): Promise<CanonicalNotificationProjectionRow[]> {
    return fetchActiveBatch(afterId, limit)
  }

  async tombstoneBatch(
    afterId: string | null,
    limit: number
  ): Promise<NotificationTombstoneProjectionRow[]> {
    return fetchTombstoneBatch(afterId, limit)
  }

  async recordBackfillBatch(input: {
    runId: string
    kind: 'notification' | 'tombstone'
    lastId: string
    count: number
  }): Promise<void> {
    return recordProjectionBackfillBatch(input)
  }

  async completeBackfill(run: NotificationProjectionRun): Promise<void> {
    return completeProjectionBackfill(run)
  }

  async captureS1(runId: string): Promise<number> {
    return captureProjectionS1(runId)
  }

  async catchupState(
    run: NotificationProjectionRun,
    s1: number
  ): Promise<NotificationProjectionCatchupState> {
    return computeProjectionCatchupState(run, s1)
  }

  expectedDocuments(batchSize: number): AsyncGenerator<NotificationSearchDocument> {
    return generateExpectedDocuments(
      batchSize,
      (afterId, limit) => this.activeBatch(afterId, limit),
      (afterId, limit) => this.tombstoneBatch(afterId, limit)
    )
  }

  async recordReconciliation(input: {
    runId: string
    missing: number
    stale: number
    extra: number
    report: Record<string, unknown>
    passed: boolean
  }): Promise<void> {
    return recordProjectionReconciliation(input)
  }

  async beginCutover(input: {
    runId: string
    actorId: string
    reason: string
    requestedAt: Date
  }): Promise<void> {
    return beginProjectionCutover(input)
  }

  async finalizeCutover(
    run: NotificationProjectionRun,
    rollbackUntil: Date,
    cutover: () => Promise<void>
  ): Promise<void> {
    return finalizeProjectionCutover(run, rollbackUntil, cutover)
  }

  async rollbackPlan(targetIndex: string, now: Date): Promise<NotificationProjectionRollbackPlan> {
    return planProjectionRollback(targetIndex, now)
  }

  async beginRollback(
    plan: NotificationProjectionRollbackPlan,
    input: { actorId: string; reason: string; now: Date }
  ): Promise<void> {
    return beginProjectionRollback(plan, input)
  }

  async finalizeRollback(
    plan: NotificationProjectionRollbackPlan,
    input: {
      actorId: string
      reason: string
      now: Date
    },
    cutover: () => Promise<void>
  ): Promise<void> {
    return finalizeProjectionRollback(plan, input, cutover)
  }

  async reload(runId: string): Promise<NotificationProjectionRun> {
    return reloadNotificationProjectionRun(runId)
  }

  async assertCompletedPromotion(input: {
    runId: string
    targetId: string
    actorId: string
    reason: string
  }): Promise<void> {
    return assertCompletedProjectionPromotion(input)
  }
}
