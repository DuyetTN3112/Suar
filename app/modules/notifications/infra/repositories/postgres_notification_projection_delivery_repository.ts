import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { buildSearchIndexName } from '#config/search'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { NotificationOutboxJob } from '#modules/notifications/domain/notification_outbox'

export interface NotificationProjectionTarget {
  id: string
  targetKey: string
  physicalIndex: string
  status: 'building' | 'primary' | 'rollback'
  activeFromSequence: number
  requiredUntil: Date | null
}

export interface NotificationProjectionDelivery {
  outboxId: string
  targetId: string
  status: 'pending' | 'leased' | 'processed' | 'dead_letter'
  leaseToken: string | null
  lockedUntil: Date | null
  appliedRevision: number | null
  lastErrorClass: string | null
}

interface TargetDatabaseRow {
  id: string
  target_key: string
  physical_index: string
  status: 'building' | 'primary' | 'rollback' | 'retired'
  active_from_sequence: number | string
  required_until: Date | null
}

interface DeliveryDatabaseRow {
  outbox_id: string
  target_id: string
  status: 'pending' | 'leased' | 'processed' | 'dead_letter'
  lease_token: string | null
  locked_until: Date | null
  applied_revision: number | string | null
  last_error_class: string | null
}

const DEFAULT_TARGET_KEY = 'notifications-feed-v000001'

export const DEFAULT_NOTIFICATION_PHYSICAL_INDEX = buildSearchIndexName(
  'notifications_feed_v000001'
)
export const DEFAULT_NOTIFICATION_READ_ALIAS = buildSearchIndexName('notifications_read')
export const DEFAULT_NOTIFICATION_WRITE_ALIAS = buildSearchIndexName('notifications_write')

function toTarget(row: TargetDatabaseRow): NotificationProjectionTarget {
  if (row.status === 'retired') {
    throw new InvariantViolationException(
      'Retired notification projection target cannot be required'
    )
  }
  return {
    id: row.id,
    targetKey: row.target_key,
    physicalIndex: row.physical_index,
    status: row.status,
    activeFromSequence: Number(row.active_from_sequence),
    requiredUntil: row.required_until,
  }
}

function toDelivery(row: DeliveryDatabaseRow): NotificationProjectionDelivery {
  return {
    outboxId: row.outbox_id,
    targetId: row.target_id,
    status: row.status,
    leaseToken: row.lease_token,
    lockedUntil: row.locked_until,
    appliedRevision: row.applied_revision === null ? null : Number(row.applied_revision),
    lastErrorClass: row.last_error_class,
  }
}

function isRequired(row: TargetDatabaseRow, outboxSequence: number, now: Date): boolean {
  if (row.status === 'primary') {
    return true
  }
  if (row.status === 'building') {
    return outboxSequence > Number(row.active_from_sequence)
  }
  if (row.status === 'rollback') {
    return (
      outboxSequence > Number(row.active_from_sequence) &&
      (row.required_until === null || row.required_until > now)
    )
  }
  return false
}

export class PostgresNotificationProjectionDeliveryRepository {
  async prepareRequiredDeliveries(
    job: NotificationOutboxJob,
    now: Date
  ): Promise<
    Array<{
      target: NotificationProjectionTarget
      delivery: NotificationProjectionDelivery
    }>
  > {
    return db.transaction(async (trx) => {
      await this.ensurePrimaryTarget(trx, now)
      const targetRows = (await trx
        .from('notification_projection_targets')
        .whereIn('status', ['primary', 'building', 'rollback'])
        .orderByRaw("CASE status WHEN 'primary' THEN 0 WHEN 'building' THEN 1 ELSE 2 END")
        .orderBy('target_key', 'asc')) as TargetDatabaseRow[]
      const requiredTargets = targetRows.filter((target) => isRequired(target, job.sequence, now))

      await trx
        .table('notification_projection_deliveries')
        .insert(
          requiredTargets.map((target) => ({
            outbox_id: job.id,
            target_id: target.id,
            status: 'pending',
            available_at: now,
          }))
        )
        .onConflict(['outbox_id', 'target_id'])
        .ignore()

      const deliveryRows = (await trx
        .from('notification_projection_deliveries')
        .where('outbox_id', job.id)
        .whereIn(
          'target_id',
          requiredTargets.map((target) => target.id)
        )) as DeliveryDatabaseRow[]
      const deliveryByTarget = new Map(
        deliveryRows.map((delivery) => [delivery.target_id, delivery])
      )

      return requiredTargets.map((target) => {
        const delivery = deliveryByTarget.get(target.id)
        if (!delivery) {
          throw new InvariantViolationException(
            `Missing projection delivery for target ${target.target_key}`
          )
        }
        return {
          target: toTarget(target),
          delivery: toDelivery(delivery),
        }
      })
    })
  }

  async leaseDelivery(input: {
    outboxId: string
    targetId: string
    parentLeaseToken: string
    parentLockedUntil: Date
    now: Date
  }): Promise<boolean> {
    const result = await db
      .from('notification_projection_deliveries')
      .where('outbox_id', input.outboxId)
      .where('target_id', input.targetId)
      .where((claimable) => {
        void claimable
          .where((pending) => {
            void pending.where('status', 'pending').where('available_at', '<=', input.now)
          })
          .orWhere((expired) => {
            void expired.where('status', 'leased').where('locked_until', '<=', input.now)
          })
          .orWhere((owned) => {
            void owned.where('status', 'leased').where('lease_token', input.parentLeaseToken)
          })
      })
      .update({
        status: 'leased',
        attempt_count: db.raw('attempt_count + 1'),
        locked_by: 'notification-outbox-parent',
        locked_until: input.parentLockedUntil,
        lease_token: input.parentLeaseToken,
        updated_at: input.now,
      })

    return Number(result) === 1
  }

  async acknowledgeDelivery(input: {
    outboxId: string
    targetId: string
    parentLeaseToken: string
    appliedRevision: number
    now: Date
  }): Promise<boolean> {
    return db.transaction(async (trx) => {
      const result = await trx
        .from('notification_projection_deliveries')
        .where('outbox_id', input.outboxId)
        .where('target_id', input.targetId)
        .where('status', 'leased')
        .where('lease_token', input.parentLeaseToken)
        .where('locked_until', '>', input.now)
        .update({
          status: 'processed',
          applied_revision: input.appliedRevision,
          processed_at: input.now,
          locked_by: null,
          locked_until: null,
          lease_token: null,
          last_error_class: null,
          last_error_message: null,
          updated_at: input.now,
        })
      if (Number(result) !== 1) {
        return false
      }

      await this.advanceContiguousCheckpoint(trx, input.targetId, input.now)
      return true
    })
  }

  async failDelivery(input: {
    outboxId: string
    targetId: string
    parentLeaseToken: string
    permanent: boolean
    errorClass: string
    errorMessage: string
    now: Date
  }): Promise<boolean> {
    const result = await db
      .from('notification_projection_deliveries')
      .where('outbox_id', input.outboxId)
      .where('target_id', input.targetId)
      .where('status', 'leased')
      .where('lease_token', input.parentLeaseToken)
      .where('locked_until', '>', input.now)
      .update({
        status: input.permanent ? 'dead_letter' : 'pending',
        available_at: input.now,
        locked_by: null,
        locked_until: null,
        lease_token: null,
        last_error_class: input.errorClass.slice(0, 200),
        last_error_message: input.errorMessage.slice(0, 1_024),
        updated_at: input.now,
      })

    return Number(result) === 1
  }

  private async ensurePrimaryTarget(trx: TransactionClientContract, now: Date): Promise<void> {
    await trx.rawQuery(
      "SELECT pg_advisory_xact_lock(hashtext('suar_notification_projection_primary'))"
    )
    const primary: unknown = await trx
      .from('notification_projection_targets')
      .select('id')
      .where('status', 'primary')
      .first()
    if (primary) {
      return
    }

    await trx.table('notification_projection_targets').insert({
      target_key: DEFAULT_TARGET_KEY,
      physical_index: DEFAULT_NOTIFICATION_PHYSICAL_INDEX,
      status: 'primary',
      active_from_sequence: 0,
      checkpoint_sequence: 0,
      reconciliation_status: 'pending',
      created_at: now,
      updated_at: now,
    })
  }

  private async advanceContiguousCheckpoint(
    trx: TransactionClientContract,
    targetId: string,
    now: Date
  ): Promise<void> {
    const target = (await trx
      .from('notification_projection_targets')
      .select('active_from_sequence', 'checkpoint_sequence')
      .where('id', targetId)
      .forUpdate()
      .first()) as
      | { active_from_sequence: number | string; checkpoint_sequence: number | string }
      | undefined
    if (!target) {
      throw new InvariantViolationException(
        `Projection target ${targetId} disappeared while advancing checkpoint`
      )
    }

    const activeFrom = Number(target.active_from_sequence)
    const checkpoint = Number(target.checkpoint_sequence)
    if (checkpoint < activeFrom) {
      return
    }

    const gap = (await trx
      .from('notification_outbox as outbox')
      .leftJoin('notification_projection_deliveries as delivery', (join) => {
        join
          .on('delivery.outbox_id', '=', 'outbox.id')
          .andOnVal('delivery.target_id', '=', targetId)
      })
      .where('outbox.destination', 'feed_search')
      .where('outbox.sequence', '>', checkpoint)
      .where((missing) => {
        void missing.whereNull('delivery.outbox_id').orWhereNot('delivery.status', 'processed')
      })
      .min('outbox.sequence as sequence')
      .first()) as { sequence?: number | string | null } | undefined
    const firstGap =
      gap?.sequence === null || gap?.sequence === undefined ? null : Number(gap.sequence)

    let candidateQuery = trx
      .from('notification_outbox')
      .where('destination', 'feed_search')
      .where('sequence', '>', checkpoint)
    if (firstGap !== null) {
      candidateQuery = candidateQuery.where('sequence', '<', firstGap)
    }
    const candidate = (await candidateQuery.max('sequence as sequence').first()) as
      | { sequence?: number | string | null }
      | undefined
    if (candidate?.sequence === null || candidate?.sequence === undefined) {
      return
    }

    await trx
      .from('notification_projection_targets')
      .where('id', targetId)
      .where('checkpoint_sequence', checkpoint)
      .update({
        checkpoint_sequence: Number(candidate.sequence),
        updated_at: now,
      })
  }
}
