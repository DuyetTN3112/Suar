import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import { acquireNotificationProjectionCutoverFence } from './notification_projection_fence.js'
import { DEFAULT_NOTIFICATION_PHYSICAL_INDEX } from './postgres_notification_projection_delivery_repository.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  NotificationProjectionPlan,
  NotificationProjectionRun,
  NotificationProjectionRunStatus,
} from '#modules/notifications/domain/notification-feed/notification_projection_lifecycle'

export interface ProjectionRunRow {
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

export interface TargetRow {
  id: string
  physical_index: string
}

export const DEFAULT_TARGET_KEY = 'notifications-feed-v000001'
export const ACTIVE_REBUILD_STATUSES: NotificationProjectionRunStatus[] = [
  'initialized',
  'backfilling',
  'catching_up',
  'reconciling',
  'ready',
  'cutting_over',
]

export function toRun(row: ProjectionRunRow): NotificationProjectionRun {
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

export function notificationProjectionRunQuery() {
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

export async function reloadNotificationProjectionRun(
  runId: string
): Promise<NotificationProjectionRun> {
  const row = (await notificationProjectionRunQuery().where('run.id', runId).first()) as
    | ProjectionRunRow
    | undefined
  if (!row) {
    throw new InvariantViolationException(`Notification projection run ${runId} not found`)
  }
  return toRun(row)
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

export async function planProjectionRebuild(): Promise<NotificationProjectionPlan> {
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

export async function initializeProjectionRebuild(input: {
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
      .whereIn('status', ACTIVE_REBUILD_STATUSES as string[])
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

export async function initializeProjectionReconciliation(input: {
  actorId: string
  reason: string
}): Promise<NotificationProjectionRun> {
  return db.transaction(async (trx) => {
    await trx.rawQuery(
      "SELECT pg_advisory_xact_lock(hashtext('suar_notification_projection_reconcile'))"
    )
    const active = (await trx
      .from('notification_projection_runs')
      .select('id', 'target_id')
      .where('run_kind', 'reconcile')
      .whereIn('status', ACTIVE_REBUILD_STATUSES as string[])
      .first()) as { id: string; target_id: string } | undefined
    if (active) {
      const activeTarget = (await trx
        .from('notification_projection_targets')
        .select('status')
        .where('id', active.target_id)
        .first()) as { status?: string } | undefined
      if (activeTarget?.status === 'primary') {
        return await reloadNotificationProjectionRun(active.id)
      }
      await trx
        .from('notification_projection_runs')
        .where('id', active.id)
        .update({ status: 'failed', completed_at: new Date(), updated_at: new Date() })
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

export async function completeProjectionReconciliation(
  runId: string,
  passed: boolean
): Promise<void> {
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
