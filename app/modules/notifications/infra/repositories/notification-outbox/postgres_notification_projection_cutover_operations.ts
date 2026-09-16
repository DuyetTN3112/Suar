import db from '@adonisjs/lucid/services/db'

import { acquireNotificationProjectionCutoverFence } from './notification_projection_fence.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  NotificationProjectionRun,
  NotificationProjectionRunStatus,
} from '#modules/notifications/domain/notification-feed/notification_projection_lifecycle'

export async function recordProjectionReconciliation(input: {
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

export async function beginProjectionCutover(input: {
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

export async function finalizeProjectionCutover(
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

export async function assertCompletedProjectionPromotion(input: {
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
