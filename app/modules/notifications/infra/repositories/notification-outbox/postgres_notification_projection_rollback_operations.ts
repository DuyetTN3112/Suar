import db from '@adonisjs/lucid/services/db'

import { acquireNotificationProjectionCutoverFence } from './notification_projection_fence.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { NotificationProjectionRollbackPlan } from '#modules/notifications/domain/notification-feed/notification_projection_lifecycle'

export async function planProjectionRollback(
  targetIndex: string,
  now: Date
): Promise<NotificationProjectionRollbackPlan> {
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

export async function beginProjectionRollback(
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

export async function finalizeProjectionRollback(
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
