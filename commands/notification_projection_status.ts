import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'
import {
  DEFAULT_NOTIFICATION_READ_ALIAS,
  DEFAULT_NOTIFICATION_WRITE_ALIAS,
} from '#modules/notifications/infra/repositories/postgres_notification_projection_delivery_repository'
import { NotificationProjectionAdminRepository } from '#modules/notifications/infra/search/notification_projection_admin_repository'

const MAX_STATUS_ROWS = 100

export default class NotificationProjectionStatusCommand extends BaseCommand {
  static override commandName = 'notification:projection-status'
  static override description =
    'Show bounded notification projection targets, aliases, checkpoints, and active runs'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({ description: 'Authenticated operator user UUID' })
  declare actorId?: string

  override async run(): Promise<void> {
    if (!this.actorId) {
      this.logger.error('--actor-id is required')
      this.exitCode = 1
      return
    }
    const actor = (await db
      .from('users')
      .select('id', 'system_role', 'status')
      .where('id', this.actorId)
      .first()) as { id: string; system_role: string; status: string } | undefined
    if (
      !actor ||
      actor.status !== 'active' ||
      !(await hasSystemPermission(actor.system_role, 'can_manage_notification_operations'))
    ) {
      this.logger.error('Actor is not an active authorized notification operations user')
      this.exitCode = 1
      return
    }

    const admin = new NotificationProjectionAdminRepository()
    const readAlias = await admin.aliasIndices(DEFAULT_NOTIFICATION_READ_ALIAS)
    const writeAlias = await admin.aliasIndices(DEFAULT_NOTIFICATION_WRITE_ALIAS)
    const targets = (await db
      .from('notification_projection_targets')
      .select(
        'id',
        'target_key',
        'physical_index',
        'status',
        'active_from_sequence',
        'required_until',
        'checkpoint_sequence',
        'reconciliation_status',
        'reconciled_at',
        'rollback_eligible',
        'retired_at',
        'physical_deleted_at',
        'rollback_requested_by',
        'rollback_requested_at',
        'rolled_back_at'
      )
      .orderBy('created_at', 'desc')
      .limit(MAX_STATUS_ROWS)) as Array<Record<string, unknown>>
    const runs = (await db
      .from('notification_projection_runs')
      .select(
        'id',
        'run_kind',
        'status',
        'target_id',
        'source_target_id',
        's0_sequence',
        's1_sequence',
        'scanned_count',
        'projected_count',
        'missing_count',
        'stale_count',
        'extra_count',
        'started_at',
        'updated_at',
        'completed_at'
      )
      .orderBy('started_at', 'desc')
      .limit(MAX_STATUS_ROWS)) as Array<Record<string, unknown>>
    const targetTotalRow = (await db
      .from('notification_projection_targets')
      .count('* as total')
      .first()) as { total?: number | string } | undefined
    const primaryTotalRow = (await db
      .from('notification_projection_targets')
      .where('status', 'primary')
      .count('* as total')
      .first()) as { total?: number | string } | undefined
    const primaryPhysicalRow = (await db
      .from('notification_projection_targets')
      .select('physical_index', 'checkpoint_sequence')
      .where('status', 'primary')
      .first()) as { physical_index?: string; checkpoint_sequence?: number | string } | undefined
    const outboxWatermarkRow = (await db
      .from('notification_outbox')
      .max('sequence as sequence')
      .first()) as { sequence?: number | string } | undefined

    const targetTotal = Number(targetTotalRow?.total ?? 0)
    const primaryTotal = Number(primaryTotalRow?.total ?? 0)
    const primaryPhysicalIndex = primaryPhysicalRow?.physical_index ?? null
    const outboxWatermark = Number(outboxWatermarkRow?.sequence ?? 0)
    const primaryCheckpoint = Number(primaryPhysicalRow?.checkpoint_sequence ?? 0)

    const payload = {
      component: 'notification_projection',
      aliases: {
        read: readAlias,
        write: writeAlias,
        readCardinality: readAlias.length,
        writeCardinality: writeAlias.length,
      },
      targetSummary: {
        total: targetTotal,
        primary: primaryTotal,
        returned: targets.length,
        truncated: targetTotal > targets.length,
      },
      primary: {
        physicalIndex: primaryPhysicalIndex,
        checkpointSequence: primaryCheckpoint,
        outboxWatermark,
        lag: Math.max(0, outboxWatermark - primaryCheckpoint),
      },
      targets: targets.map((target) => ({
        id: target['id'],
        targetKey: target['target_key'],
        physicalIndex: target['physical_index'],
        status: target['status'],
        activeFromSequence: Number(target['active_from_sequence']),
        requiredUntil: target['required_until'],
        checkpointSequence: Number(target['checkpoint_sequence']),
        reconciliationStatus: target['reconciliation_status'],
        reconciledAt: target['reconciled_at'],
        rollbackEligible: target['rollback_eligible'],
        retiredAt: target['retired_at'],
        physicalDeletedAt: target['physical_deleted_at'],
        rollbackRequestedBy: target['rollback_requested_by'],
        rollbackRequestedAt: target['rollback_requested_at'],
        rolledBackAt: target['rolled_back_at'],
      })),
      runs: runs.map((run) => ({
        id: run['id'],
        kind: run['run_kind'],
        status: run['status'],
        targetId: run['target_id'],
        sourceTargetId: run['source_target_id'],
        s0Sequence: Number(run['s0_sequence']),
        s1Sequence: run['s1_sequence'] === null ? null : Number(run['s1_sequence']),
        scannedCount: Number(run['scanned_count']),
        projectedCount: Number(run['projected_count']),
        missingCount: Number(run['missing_count']),
        staleCount: Number(run['stale_count']),
        extraCount: Number(run['extra_count']),
        startedAt: run['started_at'],
        updatedAt: run['updated_at'],
        completedAt: run['completed_at'],
      })),
    }
    this.logger.info(JSON.stringify(payload))

    if (
      readAlias.length !== 1 ||
      writeAlias.length !== 1 ||
      primaryTotal !== 1 ||
      !primaryPhysicalIndex ||
      readAlias[0] !== writeAlias[0] ||
      readAlias[0] !== primaryPhysicalIndex
    ) {
      this.logger.error('Notification projection status is inconsistent')
      this.exitCode = 2
      return
    }
    this.logger.success('Notification projection status is consistent')
  }
}
