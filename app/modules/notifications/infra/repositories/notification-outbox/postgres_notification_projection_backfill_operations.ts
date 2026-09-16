import db from '@adonisjs/lucid/services/db'

import { acquireNotificationProjectionCutoverFence } from './notification_projection_fence.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  toActiveNotificationSearchDocument,
  toNotificationTombstoneSearchDocument,
  type CanonicalNotificationProjectionRow,
  type NotificationSearchDocument,
  type NotificationTombstoneProjectionRow,
} from '#modules/notifications/domain/notification-feed/notification_projection_document'
import type {
  NotificationProjectionCatchupState,
  NotificationProjectionRun,
} from '#modules/notifications/domain/notification-feed/notification_projection_lifecycle'

export async function fetchActiveBatch(
  afterId: string | null,
  limit: number
): Promise<CanonicalNotificationProjectionRow[]> {
  let query = db.from('notifications').orderBy('id', 'asc').limit(limit)
  if (afterId) {
    query = query.where('id', '>', afterId)
  }
  return (await query) as CanonicalNotificationProjectionRow[]
}

export async function fetchTombstoneBatch(
  afterId: string | null,
  limit: number
): Promise<NotificationTombstoneProjectionRow[]> {
  let query = db.from('notification_tombstones').orderBy('notification_id', 'asc').limit(limit)
  if (afterId) {
    query = query.where('notification_id', '>', afterId)
  }
  return (await query) as NotificationTombstoneProjectionRow[]
}

export async function recordProjectionBackfillBatch(input: {
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

export async function completeProjectionBackfill(run: NotificationProjectionRun): Promise<void> {
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

export async function captureProjectionS1(runId: string): Promise<number> {
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

export async function computeProjectionCatchupState(
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

export async function* generateExpectedDocuments(
  batchSize: number,
  activeBatchFn: (afterId: string | null, limit: number) => Promise<CanonicalNotificationProjectionRow[]>,
  tombstoneBatchFn: (afterId: string | null, limit: number) => Promise<NotificationTombstoneProjectionRow[]>
): AsyncGenerator<NotificationSearchDocument> {
  let activeCursor: string | null = null
  let tombstoneCursor: string | null = null
  let activeRows = await activeBatchFn(activeCursor, batchSize)
  let tombstoneRows = await tombstoneBatchFn(tombstoneCursor, batchSize)
  let activeIndex = 0
  let tombstoneIndex = 0

  for (;;) {
    if (activeIndex >= activeRows.length && activeRows.length === batchSize) {
      activeCursor = activeRows.at(-1)?.id ?? activeCursor
      activeRows = await activeBatchFn(activeCursor, batchSize)
      activeIndex = 0
    }
    if (tombstoneIndex >= tombstoneRows.length && tombstoneRows.length === batchSize) {
      tombstoneCursor = tombstoneRows.at(-1)?.notification_id ?? tombstoneCursor
      tombstoneRows = await tombstoneBatchFn(tombstoneCursor, batchSize)
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
