import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  toActiveNotificationSearchDocument,
  toNotificationTombstoneSearchDocument,
  type CanonicalNotificationProjectionRow,
  type NotificationSearchDocument,
  type NotificationTombstoneProjectionRow,
} from '#modules/notifications/domain/notification_projection_document'
import type {
  NotificationProjectionCatchupState,
  NotificationProjectionPlan,
  NotificationProjectionRollbackPlan,
  NotificationProjectionRun,
  NotificationProjectionRunStatus,
} from '#modules/notifications/domain/notification_projection_lifecycle'
import { acquireNotificationProjectionCutoverFence } from '#modules/notifications/infra/repositories/notification_projection_fence'
import { DEFAULT_NOTIFICATION_PHYSICAL_INDEX } from '#modules/notifications/infra/repositories/postgres_notification_projection_delivery_repository'

export type {
  NotificationProjectionCatchupState,
  NotificationProjectionPlan,
  NotificationProjectionRollbackPlan,
  NotificationProjectionRun,
  NotificationProjectionRunStatus,
} from '#modules/notifications/domain/notification_projection_lifecycle'

interface ProjectionRunRow {
  id: string
  status: NotificationProjectionRunStatus
  target_id: string
  source_target_id: string | null
  s0_sequence: number | string
  s1_sequence: number | string | null
  last_notification_id: string | null
  last_tombstone_id: string | null
  scanned_count: number | string
  projected_count: number | string
  target_index: string
  source_index: string | null
}

interface TargetRow {
  id: string
  physical_index: string
}

const DEFAULT_TARGET_KEY = 'notifications-feed-v000001'
const ACTIVE_REBUILD_STATUSES: NotificationProjectionRunStatus[] = [
  'initialized',
  'backfilling',
  'catching_up',
  'reconciling',
  'ready',
  'cutting_over',
]

function toRun(row: ProjectionRunRow): NotificationProjectionRun {
  return {
    id: row.id,
    status: row.status,
    targetId: row.target_id,
    sourceTargetId: row.source_target_id,
    targetIndex: row.target_index,
    sourceIndex: row.source_index,
    s0Sequence: Number(row.s0_sequence),
    s1Sequence: row.s1_sequence === null ? null : Number(row.s1_sequence),
    lastNotificationId: row.last_notification_id,
    lastTombstoneId: row.last_tombstone_id,
    scannedCount: Number(row.scanned_count),
    projectedCount: Number(row.projected_count),
  }
}

function nextVersionedIndex(indices: string[]): string {
  const pattern = /^(.*_v)(\d{6})$/u
  let base = DEFAULT_NOTIFICATION_PHYSICAL_INDEX.replace(/_v\d{6}$/u, '_v')
  let maximum = 1
  for (const index of indices) {
    const match = pattern.exec(index)
    if (!match) {
      continue
    }
    base = match[1] ?? base
    maximum = Math.max(maximum, Number(match[2]))
  }
  return `${base}${String(maximum + 1).padStart(6, '0')}`
}

async function countTable(table: string): Promise<number> {
  const row = (await db.from(table).count('* as count').first()) as
    | { count?: number | string }
    | undefined
  return Number(row?.count ?? 0)
}

export class PostgresNotificationProjectionOperationsRepository {
  async plan(): Promise<NotificationProjectionPlan> {
    const targets = (await db
      .from('notification_projection_targets')
      .select('id', 'physical_index', 'status')
      .whereNot('status', 'retired')
      .orderBy('created_at', 'asc')) as Array<TargetRow & { status: string }>
    const primary = targets.find((target) => target.status === 'primary') ?? null
    const watermark = (await db.from('notification_outbox').max('sequence as sequence').first()) as
      | { sequence?: number | string | null }
      | undefined
    const targetIndex = nextVersionedIndex(targets.map((target) => target.physical_index))

    return {
      sourceTargetId: primary?.id ?? null,
      sourceIndex: primary?.physical_index ?? null,
      targetIndex,
      targetKey: `rebuild-${targetIndex}`,
      highWatermark: Number(watermark?.sequence ?? 0),
      activeNotifications: await countTable('notifications'),
      retainedTombstones: await countTable('notification_tombstones'),
    }
  }

  async activeRun(): Promise<NotificationProjectionRun | null> {
    const row = (await this.runQuery()
      .where('run.run_kind', 'rebuild')
      .whereIn('run.status', ACTIVE_REBUILD_STATUSES)
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
    return db.transaction(async (trx) => {
      await trx.rawQuery(
        "SELECT pg_advisory_xact_lock(hashtext('suar_notification_projection_rebuild'))"
      )
      const active = (await trx
        .from('notification_projection_runs')
        .select('id')
        .where('run_kind', 'rebuild')
        .whereIn('status', ACTIVE_REBUILD_STATUSES)
        .first()) as { id: string } | undefined
      if (active) {
        throw new InvariantViolationException('notification_projection_rebuild_already_active')
      }

      let source = (await trx
        .from('notification_projection_targets')
        .select('id', 'physical_index')
        .where('status', 'primary')
        .orderBy('created_at', 'asc')
        .first()) as TargetRow | undefined
      if (!source) {
        const sourceId = randomUUID()
        await trx.table('notification_projection_targets').insert({
          id: sourceId,
          target_key: DEFAULT_TARGET_KEY,
          physical_index: DEFAULT_NOTIFICATION_PHYSICAL_INDEX,
          status: 'primary',
          active_from_sequence: 0,
          checkpoint_sequence: 0,
          reconciliation_status: 'pending',
        })
        source = { id: sourceId, physical_index: DEFAULT_NOTIFICATION_PHYSICAL_INDEX }
      }

      await acquireNotificationProjectionCutoverFence(trx)
      const watermark = (await trx
        .from('notification_outbox')
        .max('sequence as sequence')
        .first()) as { sequence?: number | string | null } | undefined
      const s0 = Number(watermark?.sequence ?? 0)
      const targetId = randomUUID()
      const runId = randomUUID()
      await trx.table('notification_projection_targets').insert({
        id: targetId,
        target_key: input.targetKey,
        physical_index: input.targetIndex,
        status: 'building',
        active_from_sequence: s0,
        checkpoint_sequence: 0,
        reconciliation_status: 'pending',
      })
      await trx.table('notification_projection_runs').insert({
        id: runId,
        run_kind: 'rebuild',
        status: 'initialized',
        target_id: targetId,
        source_target_id: source.id,
        s0_sequence: s0,
        requested_by: input.actorId,
        reason: input.reason,
      })

      return {
        id: runId,
        status: 'initialized',
        targetId,
        sourceTargetId: source.id,
        targetIndex: input.targetIndex,
        sourceIndex: source.physical_index,
        s0Sequence: s0,
        s1Sequence: null,
        lastNotificationId: null,
        lastTombstoneId: null,
        scannedCount: 0,
        projectedCount: 0,
      }
    })
  }

  async initializeReconciliation(input: {
    actorId: string
    reason: string
  }): Promise<NotificationProjectionRun> {
    return db.transaction(async (trx) => {
      await trx.rawQuery(
        "SELECT pg_advisory_xact_lock(hashtext('suar_notification_projection_reconcile'))"
      )
      const active = (await trx
        .from('notification_projection_runs')
        .select('id')
        .where('run_kind', 'reconcile')
        .whereIn('status', ACTIVE_REBUILD_STATUSES)
        .first()) as { id: string } | undefined
      if (active) {
        return this.reload(active.id)
      }
      const target = (await trx
        .from('notification_projection_targets')
        .select('id', 'physical_index', 'checkpoint_sequence')
        .where('status', 'primary')
        .orderBy('created_at', 'desc')
        .first()) as
        | {
            id: string
            physical_index: string
            checkpoint_sequence: number | string
          }
        | undefined
      if (!target) {
        throw new InvariantViolationException('notification_projection_primary_target_missing')
      }
      const watermark = Number(target.checkpoint_sequence)
      const runId = randomUUID()
      await trx.table('notification_projection_runs').insert({
        id: runId,
        run_kind: 'reconcile',
        status: 'reconciling',
        target_id: target.id,
        source_target_id: null,
        s0_sequence: watermark,
        s1_sequence: watermark,
        requested_by: input.actorId,
        reason: input.reason,
      })
      return {
        id: runId,
        status: 'reconciling',
        targetId: target.id,
        sourceTargetId: null,
        targetIndex: target.physical_index,
        sourceIndex: null,
        s0Sequence: watermark,
        s1Sequence: watermark,
        lastNotificationId: null,
        lastTombstoneId: null,
        scannedCount: 0,
        projectedCount: 0,
      }
    })
  }

  async completeReconciliation(runId: string, passed: boolean): Promise<void> {
    await db
      .from('notification_projection_runs')
      .where('id', runId)
      .where('run_kind', 'reconcile')
      .update({
        status: passed ? 'completed' : 'failed',
        completed_at: new Date(),
        updated_at: new Date(),
      })
  }

  async setStatus(runId: string, status: NotificationProjectionRunStatus): Promise<void> {
    await db
      .from('notification_projection_runs')
      .where('id', runId)
      .update({ status, updated_at: new Date() })
  }

  async activeBatch(afterId: string | null, limit: number) {
    let query = db.from('notifications').orderBy('id', 'asc').limit(limit)
    if (afterId) {
      query = query.where('id', '>', afterId)
    }
    return (await query) as CanonicalNotificationProjectionRow[]
  }

  async tombstoneBatch(afterId: string | null, limit: number) {
    let query = db.from('notification_tombstones').orderBy('notification_id', 'asc').limit(limit)
    if (afterId) {
      query = query.where('notification_id', '>', afterId)
    }
    return (await query) as NotificationTombstoneProjectionRow[]
  }

  async recordBackfillBatch(input: {
    runId: string
    kind: 'notification' | 'tombstone'
    lastId: string
    count: number
  }): Promise<void> {
    await db
      .from('notification_projection_runs')
      .where('id', input.runId)
      .whereIn('status', ['initialized', 'backfilling'])
      .update({
        status: 'backfilling',
        ...(input.kind === 'notification'
          ? { last_notification_id: input.lastId }
          : { last_tombstone_id: input.lastId }),
        scanned_count: db.raw('scanned_count + ?', [input.count]),
        projected_count: db.raw('projected_count + ?', [input.count]),
        updated_at: new Date(),
      })
  }

  async completeBackfill(run: NotificationProjectionRun): Promise<void> {
    await db.transaction(async (trx) => {
      await trx
        .from('notification_projection_targets')
        .where('id', run.targetId)
        .where('status', 'building')
        .update({
          checkpoint_sequence: run.s0Sequence,
          backfill_completed_at: new Date(),
          updated_at: new Date(),
        })
      await trx
        .from('notification_projection_runs')
        .where('id', run.id)
        .whereIn('status', ['initialized', 'backfilling'])
        .update({
          status: 'catching_up',
          updated_at: new Date(),
        })
    })
  }

  async captureS1(runId: string): Promise<number> {
    return db.transaction(async (trx) => {
      await acquireNotificationProjectionCutoverFence(trx)
      const watermark = (await trx
        .from('notification_outbox')
        .max('sequence as sequence')
        .first()) as { sequence?: number | string | null } | undefined
      const s1 = Number(watermark?.sequence ?? 0)
      await trx
        .from('notification_projection_runs')
        .where('id', runId)
        .whereIn('status', ['catching_up', 'reconciling', 'ready'])
        .update({
          s1_sequence: s1,
          updated_at: new Date(),
        })
      return s1
    })
  }

  async catchupState(
    run: NotificationProjectionRun,
    s1: number
  ): Promise<NotificationProjectionCatchupState> {
    const required = (await db
      .from('notification_outbox')
      .where('destination', 'feed_search')
      .where('sequence', '>', run.s0Sequence)
      .where('sequence', '<=', s1)
      .max('sequence as sequence')
      .first()) as { sequence?: number | string | null } | undefined
    const requiredThrough = Number(required?.sequence ?? run.s0Sequence)
    const target = (await db
      .from('notification_projection_targets')
      .select('checkpoint_sequence')
      .where('id', run.targetId)
      .first()) as { checkpoint_sequence: number | string } | undefined
    const incomplete = (await db
      .from('notification_outbox as outbox')
      .leftJoin('notification_projection_deliveries as delivery', (join) => {
        join
          .on('delivery.outbox_id', '=', 'outbox.id')
          .andOnVal('delivery.target_id', '=', run.targetId)
      })
      .where('outbox.destination', 'feed_search')
      .where('outbox.sequence', '>', run.s0Sequence)
      .where('outbox.sequence', '<=', s1)
      .where((missing) => {
        void missing.whereNull('delivery.outbox_id').orWhereNot('delivery.status', 'processed')
      })
      .select(
        db.raw('COUNT(*) AS incomplete'),
        db.raw("COUNT(*) FILTER (WHERE delivery.status = 'dead_letter') AS dead_letter")
      )
      .first()) as { incomplete: number | string; dead_letter: number | string } | undefined
    const checkpoint = Number(target?.checkpoint_sequence ?? 0)
    const incompleteDeliveries = Number(incomplete?.incomplete ?? 0)
    const deadLetterDeliveries = Number(incomplete?.dead_letter ?? 0)

    return {
      requiredThroughSequence: requiredThrough,
      checkpointSequence: checkpoint,
      incompleteDeliveries,
      deadLetterDeliveries,
      caughtUp:
        checkpoint >= requiredThrough && incompleteDeliveries === 0 && deadLetterDeliveries === 0,
    }
  }

  async *expectedDocuments(batchSize: number): AsyncGenerator<NotificationSearchDocument> {
    let activeCursor: string | null = null
    let tombstoneCursor: string | null = null
    let activeRows = await this.activeBatch(activeCursor, batchSize)
    let tombstoneRows = await this.tombstoneBatch(tombstoneCursor, batchSize)
    let activeIndex = 0
    let tombstoneIndex = 0

    for (;;) {
      if (activeIndex >= activeRows.length && activeRows.length === batchSize) {
        activeCursor = activeRows.at(-1)?.id ?? activeCursor
        activeRows = await this.activeBatch(activeCursor, batchSize)
        activeIndex = 0
      }
      if (tombstoneIndex >= tombstoneRows.length && tombstoneRows.length === batchSize) {
        tombstoneCursor = tombstoneRows.at(-1)?.notification_id ?? tombstoneCursor
        tombstoneRows = await this.tombstoneBatch(tombstoneCursor, batchSize)
        tombstoneIndex = 0
      }

      const active = activeRows[activeIndex]
      const tombstone = tombstoneRows[tombstoneIndex]
      if (!active && !tombstone) {
        return
      }
      if (active && (!tombstone || active.id < tombstone.notification_id)) {
        yield toActiveNotificationSearchDocument(active)
        activeIndex += 1
      } else if (tombstone) {
        yield toNotificationTombstoneSearchDocument(tombstone)
        tombstoneIndex += 1
      } else {
        throw new InvariantViolationException(
          'Notification projection expected-document merge lost both streams'
        )
      }
    }
  }

  async recordReconciliation(input: {
    runId: string
    missing: number
    stale: number
    extra: number
    report: Record<string, unknown>
    passed: boolean
  }): Promise<void> {
    await db.transaction(async (trx) => {
      const run = (await trx
        .from('notification_projection_runs')
        .select('target_id')
        .where('id', input.runId)
        .first()) as { target_id: string } | undefined
      if (!run) {
        throw new InvariantViolationException(
          `Notification projection run ${input.runId} disappeared`
        )
      }
      await trx
        .from('notification_projection_runs')
        .where('id', input.runId)
        .update({
          status: input.passed ? 'ready' : 'reconciling',
          missing_count: input.missing,
          stale_count: input.stale,
          extra_count: input.extra,
          report: input.report,
          updated_at: new Date(),
        })
      await trx
        .from('notification_projection_targets')
        .where('id', run.target_id)
        .update({
          reconciliation_status: input.passed ? 'passed' : 'failed',
          reconciled_at: input.passed ? new Date() : null,
          rollback_eligible: input.passed,
          updated_at: new Date(),
        })
    })
  }

  async beginCutover(input: {
    runId: string
    actorId: string
    reason: string
    requestedAt: Date
  }): Promise<void> {
    await db.transaction(async (trx) => {
      const run = (await trx
        .from('notification_projection_runs')
        .select('status', 'promotion_requested_by', 'promotion_reason')
        .where('id', input.runId)
        .forUpdate()
        .first()) as
        | {
            status: NotificationProjectionRunStatus
            promotion_requested_by: string | null
            promotion_reason: string | null
          }
        | undefined
      if (!run || (run.status !== 'ready' && run.status !== 'cutting_over')) {
        throw new InvariantViolationException('notification_projection_run_not_ready_for_cutover')
      }
      if (run.status === 'cutting_over') {
        if (run.promotion_requested_by !== input.actorId || run.promotion_reason !== input.reason) {
          throw new InvariantViolationException(
            'notification_projection_promotion_approval_conflict'
          )
        }
        return
      }
      const changed = await trx
        .from('notification_projection_runs')
        .where('id', input.runId)
        .where('status', 'ready')
        .update({
          status: 'cutting_over',
          promotion_requested_by: input.actorId,
          promotion_reason: input.reason,
          promotion_requested_at: input.requestedAt,
          updated_at: input.requestedAt,
        })
      if (Number(changed) !== 1) {
        throw new InvariantViolationException('notification_projection_run_not_ready_for_cutover')
      }
    })
  }

  async finalizeCutover(
    run: NotificationProjectionRun,
    rollbackUntil: Date,
    cutover: () => Promise<void>
  ): Promise<void> {
    await db.transaction(async (trx) => {
      await trx.rawQuery(
        "SELECT pg_advisory_xact_lock(hashtext('suar_notification_projection_primary'))"
      )
      await acquireNotificationProjectionCutoverFence(trx)
      const current = (await trx
        .from('notification_projection_runs')
        .select('status')
        .where('id', run.id)
        .forUpdate()
        .first()) as { status: NotificationProjectionRunStatus } | undefined
      if (!current || current.status !== 'cutting_over') {
        throw new InvariantViolationException('notification_projection_cutover_state_invalid')
      }
      const watermark = (await trx
        .from('notification_outbox')
        .max('sequence as sequence')
        .first()) as { sequence?: number | string | null } | undefined
      const requiredThrough = Number(watermark?.sequence ?? run.s0Sequence)
      const incomplete = (await trx
        .from('notification_outbox as outbox')
        .leftJoin('notification_projection_deliveries as delivery', (join) => {
          join
            .on('delivery.outbox_id', '=', 'outbox.id')
            .andOnVal('delivery.target_id', '=', run.targetId)
        })
        .where('outbox.destination', 'feed_search')
        .where('outbox.sequence', '>', run.s0Sequence)
        .where('outbox.sequence', '<=', requiredThrough)
        .where((missing) => {
          void missing.whereNull('delivery.outbox_id').orWhereNot('delivery.status', 'processed')
        })
        .count('* as count')
        .first()) as { count?: number | string } | undefined
      if (Number(incomplete?.count ?? 0) > 0) {
        throw new InvariantViolationException(
          'notification_projection_promotion_final_fence_catchup_incomplete'
        )
      }
      await cutover()
      if (run.sourceTargetId) {
        await trx
          .from('notification_projection_targets')
          .where('id', run.sourceTargetId)
          .where('status', 'primary')
          .update({
            status: 'rollback',
            required_until: rollbackUntil,
            rollback_eligible: true,
            reconciliation_status: 'passed',
            reconciled_at: new Date(),
            updated_at: new Date(),
          })
      }
      const promoted = await trx
        .from('notification_projection_targets')
        .where('id', run.targetId)
        .where('status', 'building')
        .where('reconciliation_status', 'passed')
        .update({
          status: 'primary',
          required_until: null,
          rollback_eligible: true,
          updated_at: new Date(),
        })
      if (Number(promoted) !== 1) {
        throw new InvariantViolationException('notification_projection_target_not_promotable')
      }
      await trx.from('notification_projection_runs').where('id', run.id).update({
        status: 'completed',
        alias_swapped_at: new Date(),
        completed_at: new Date(),
        updated_at: new Date(),
      })
    })
  }

  async rollbackPlan(targetIndex: string, now: Date): Promise<NotificationProjectionRollbackPlan> {
    const target = (await db
      .from('notification_projection_targets')
      .select(
        'id',
        'physical_index',
        'status',
        'required_until',
        'rollback_eligible',
        'checkpoint_sequence',
        'active_from_sequence',
        'reconciliation_status',
        'physical_deleted_at',
        'rollback_requested_by',
        'rollback_reason',
        'rollback_source_target_id'
      )
      .where('physical_index', targetIndex)
      .first()) as
      | {
          id: string
          physical_index: string
          status: string
          required_until: Date | string | null
          rollback_eligible: boolean
          checkpoint_sequence: number | string
          active_from_sequence: number | string
          reconciliation_status: string
          physical_deleted_at: Date | string | null
          rollback_requested_by: string | null
          rollback_reason: string | null
          rollback_source_target_id: string | null
        }
      | undefined
    if (!target) {
      throw new InvariantViolationException('notification_projection_rollback_target_missing')
    }
    if (target.status === 'primary') {
      if (!target.rollback_source_target_id) {
        throw new InvariantViolationException(
          'notification_projection_rollback_completion_evidence_missing'
        )
      }
      const previous = (await db
        .from('notification_projection_targets')
        .select('physical_index')
        .where('id', target.rollback_source_target_id)
        .first()) as { physical_index: string } | undefined
      if (!previous) {
        throw new InvariantViolationException(
          'notification_projection_rollback_previous_target_missing'
        )
      }
      return {
        currentPrimaryId: target.id,
        currentPrimaryIndex: target.physical_index,
        rollbackTargetId: target.id,
        rollbackTargetIndex: target.physical_index,
        rollbackUntil: now,
        alreadyPrimary: true,
        rollbackApprovalActorId: target.rollback_requested_by,
        rollbackApprovalReason: target.rollback_reason,
        previousPrimaryIndex: previous.physical_index,
      }
    }
    const rollbackUntil = target.required_until ? new Date(target.required_until) : null
    if (
      target.status !== 'rollback' ||
      !target.rollback_eligible ||
      target.reconciliation_status !== 'passed' ||
      target.physical_deleted_at !== null ||
      rollbackUntil === null ||
      rollbackUntil.getTime() <= now.getTime()
    ) {
      throw new InvariantViolationException('notification_projection_rollback_target_not_eligible')
    }
    const primary = (await db
      .from('notification_projection_targets')
      .select('id', 'physical_index', 'checkpoint_sequence')
      .where('status', 'primary')
      .first()) as
      | {
          id: string
          physical_index: string
          checkpoint_sequence: number | string
        }
      | undefined
    if (!primary) {
      throw new InvariantViolationException('notification_projection_primary_target_missing')
    }
    if (Number(target.checkpoint_sequence) < Number(primary.checkpoint_sequence)) {
      throw new InvariantViolationException(
        'notification_projection_rollback_target_checkpoint_stale'
      )
    }
    const incomplete = (await db
      .from('notification_outbox as outbox')
      .leftJoin('notification_projection_deliveries as delivery', (join) => {
        join
          .on('delivery.outbox_id', '=', 'outbox.id')
          .andOnVal('delivery.target_id', '=', target.id)
      })
      .where('outbox.destination', 'feed_search')
      .where('outbox.sequence', '>', Number(target.active_from_sequence))
      .where('outbox.sequence', '<=', Number(primary.checkpoint_sequence))
      .where((missing) => {
        void missing.whereNull('delivery.outbox_id').orWhereNot('delivery.status', 'processed')
      })
      .count('* as count')
      .first()) as { count: number | string } | undefined
    if (Number(incomplete?.count ?? 0) > 0) {
      throw new InvariantViolationException(
        'notification_projection_rollback_target_has_incomplete_deliveries'
      )
    }
    return {
      currentPrimaryId: primary.id,
      currentPrimaryIndex: primary.physical_index,
      rollbackTargetId: target.id,
      rollbackTargetIndex: target.physical_index,
      rollbackUntil,
      alreadyPrimary: false,
      rollbackApprovalActorId: target.rollback_requested_by,
      rollbackApprovalReason: target.rollback_reason,
      previousPrimaryIndex: primary.physical_index,
    }
  }

  async beginRollback(
    plan: NotificationProjectionRollbackPlan,
    input: { actorId: string; reason: string; now: Date }
  ): Promise<void> {
    if (plan.alreadyPrimary) {
      return
    }
    await db.transaction(async (trx) => {
      await acquireNotificationProjectionCutoverFence(trx)
      const clockResult: unknown = await trx.rawQuery('SELECT clock_timestamp() AS now')
      const databaseNow = new Date(
        String(
          (clockResult as { rows?: Array<{ now?: string | Date }> }).rows?.[0]?.now ??
            input.now.toISOString()
        )
      )
      const target = (await trx
        .from('notification_projection_targets')
        .select(
          'id',
          'status',
          'required_until',
          'rollback_eligible',
          'rollback_requested_by',
          'rollback_reason'
        )
        .where('id', plan.rollbackTargetId)
        .forUpdate()
        .first()) as
        | {
            id: string
            status: string
            required_until: Date | string | null
            rollback_eligible: boolean
            rollback_requested_by: string | null
            rollback_reason: string | null
          }
        | undefined
      if (
        !target ||
        target.status !== 'rollback' ||
        !target.rollback_eligible ||
        target.required_until === null ||
        new Date(target.required_until).getTime() <= databaseNow.getTime()
      ) {
        throw new InvariantViolationException('notification_projection_rollback_state_changed')
      }
      if (target.rollback_requested_by !== null) {
        if (
          target.rollback_requested_by !== input.actorId ||
          target.rollback_reason !== input.reason
        ) {
          throw new InvariantViolationException(
            'notification_projection_rollback_approval_conflict'
          )
        }
        return
      }
      await trx
        .from('notification_projection_targets')
        .where('id', target.id)
        .whereNull('rollback_requested_by')
        .update({
          rollback_requested_by: input.actorId,
          rollback_reason: input.reason,
          rollback_requested_at: databaseNow,
          rollback_source_target_id: plan.currentPrimaryId,
          updated_at: databaseNow,
        })
    })
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
    if (plan.alreadyPrimary) {
      return
    }
    await db.transaction(async (trx) => {
      await acquireNotificationProjectionCutoverFence(trx)
      const clockResult: unknown = await trx.rawQuery('SELECT clock_timestamp() AS now')
      const databaseNow = new Date(
        String(
          (clockResult as { rows?: Array<{ now?: string | Date }> }).rows?.[0]?.now ??
            input.now.toISOString()
        )
      )
      const rows = (await trx
        .from('notification_projection_targets')
        .select(
          'id',
          'status',
          'required_until',
          'rollback_eligible',
          'active_from_sequence',
          'rollback_requested_by',
          'rollback_reason'
        )
        .whereIn('id', [plan.currentPrimaryId, plan.rollbackTargetId])
        .forUpdate()) as Array<{
        id: string
        status: string
        required_until: Date | string | null
        rollback_eligible: boolean
        active_from_sequence: number | string
        rollback_requested_by: string | null
        rollback_reason: string | null
      }>
      const current = rows.find((row) => row.id === plan.currentPrimaryId)
      const target = rows.find((row) => row.id === plan.rollbackTargetId)
      if (
        !current ||
        !target ||
        current.status !== 'primary' ||
        target.status !== 'rollback' ||
        !target.rollback_eligible ||
        target.required_until === null ||
        new Date(target.required_until).getTime() <= databaseNow.getTime() ||
        target.rollback_requested_by !== input.actorId ||
        target.rollback_reason !== input.reason
      ) {
        throw new InvariantViolationException('notification_projection_rollback_state_changed')
      }
      const watermark = (await trx
        .from('notification_outbox')
        .max('sequence as sequence')
        .first()) as { sequence?: number | string | null } | undefined
      const requiredThrough = Number(watermark?.sequence ?? 0)
      const incomplete = (await trx
        .from('notification_outbox as outbox')
        .leftJoin('notification_projection_deliveries as delivery', (join) => {
          join
            .on('delivery.outbox_id', '=', 'outbox.id')
            .andOnVal('delivery.target_id', '=', target.id)
        })
        .where('outbox.destination', 'feed_search')
        .where('outbox.sequence', '>', Number(target.active_from_sequence))
        .where('outbox.sequence', '<=', requiredThrough)
        .where((missing) => {
          void missing.whereNull('delivery.outbox_id').orWhereNot('delivery.status', 'processed')
        })
        .count('* as count')
        .first()) as { count?: number | string } | undefined
      if (Number(incomplete?.count ?? 0) > 0) {
        throw new InvariantViolationException(
          'notification_projection_rollback_final_fence_catchup_incomplete'
        )
      }
      await cutover()
      await trx
        .from('notification_projection_targets')
        .where('id', current.id)
        .where('status', 'primary')
        .update({
          status: 'rollback',
          required_until: plan.rollbackUntil,
          rollback_eligible: true,
          updated_at: databaseNow,
        })
      const promoted = await trx
        .from('notification_projection_targets')
        .where('id', target.id)
        .where('status', 'rollback')
        .update({
          status: 'primary',
          required_until: null,
          rollback_eligible: true,
          rollback_requested_by: input.actorId,
          rollback_reason: input.reason,
          rolled_back_at: databaseNow,
          updated_at: databaseNow,
        })
      if (Number(promoted) !== 1) {
        throw new InvariantViolationException(
          'notification_projection_rollback_target_promotion_failed'
        )
      }
    })
  }

  async reload(runId: string): Promise<NotificationProjectionRun> {
    const row = (await this.runQuery().where('run.id', runId).first()) as
      | ProjectionRunRow
      | undefined
    if (!row) {
      throw new InvariantViolationException(`Notification projection run ${runId} not found`)
    }
    return toRun(row)
  }

  async assertCompletedPromotion(input: {
    runId: string
    targetId: string
    actorId: string
    reason: string
  }): Promise<void> {
    const run = (await db
      .from('notification_projection_runs as run')
      .join('notification_projection_targets as target', 'target.id', 'run.target_id')
      .select(
        'run.status',
        'run.target_id',
        'run.promotion_requested_by',
        'run.promotion_reason',
        'target.status as target_status'
      )
      .where('run.id', input.runId)
      .first()) as
      | {
          status: NotificationProjectionRunStatus
          target_id: string
          promotion_requested_by: string | null
          promotion_reason: string | null
          target_status: string
        }
      | undefined
    const primaryRows = (await db
      .from('notification_projection_targets')
      .select('id')
      .where('status', 'primary')
      .limit(2)) as Array<{ id: string }>
    if (
      !run ||
      run.status !== 'completed' ||
      run.target_id !== input.targetId ||
      run.target_status !== 'primary' ||
      primaryRows.length !== 1 ||
      primaryRows[0]?.id !== input.targetId
    ) {
      throw new InvariantViolationException('notification_projection_completed_primary_mismatch')
    }
    if (run.promotion_requested_by !== input.actorId || run.promotion_reason !== input.reason) {
      throw new InvariantViolationException('notification_projection_completed_approval_mismatch')
    }
  }

  private runQuery() {
    return db
      .from('notification_projection_runs as run')
      .join('notification_projection_targets as target', 'target.id', 'run.target_id')
      .leftJoin('notification_projection_targets as source', 'source.id', 'run.source_target_id')
      .select(
        'run.id',
        'run.status',
        'run.target_id',
        'run.source_target_id',
        'run.s0_sequence',
        'run.s1_sequence',
        'run.last_notification_id',
        'run.last_tombstone_id',
        'run.scanned_count',
        'run.projected_count',
        'target.physical_index as target_index',
        'source.physical_index as source_index'
      )
  }
}
