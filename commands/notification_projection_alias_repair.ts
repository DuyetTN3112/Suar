import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  DEFAULT_NOTIFICATION_READ_ALIAS,
  DEFAULT_NOTIFICATION_WRITE_ALIAS,
} from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_projection_delivery_repository'
import { NotificationProjectionAdminRepository } from '#modules/notifications/infra/repositories/notification-observability/notification_projection_admin_repository'

function aliasesPointOnlyTo(indices: string[], expected: string): boolean {
  return indices.length === 1 && indices[0] === expected
}

export default class NotificationProjectionAliasRepairCommand extends BaseCommand {
  static override commandName = 'notification:projection-alias-repair'
  static override description =
    'Repair an audited orphan notification alias to the DB-declared primary before promotion'

  static override options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Authenticated operator user UUID' })
  declare actorId?: string

  @flags.string({ description: 'Required operator reason (10-500 characters)' })
  declare reason?: string

  @flags.string({ description: 'Exact current orphan physical index' })
  declare expectedCurrentIndex?: string

  @flags.string({ description: 'Exact DB-declared primary physical index' })
  declare expectedPrimaryIndex?: string

  override async run(): Promise<void> {
    if (
      !this.actorId ||
      !this.reason ||
      !this.expectedCurrentIndex ||
      !this.expectedPrimaryIndex
    ) {
      this.logger.error(
        '--actor-id, --reason, --expected-current-index, and --expected-primary-index are required'
      )
      this.exitCode = 1
      return
    }
    const reason = this.reason.trim()
    if (reason.length < 10 || reason.length > 500) {
      this.logger.error('Projection alias repair reason must contain 10 to 500 characters')
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

    const primary = (await db
      .from('notification_projection_targets')
      .select('id', 'physical_index')
      .where('status', 'primary')
      .first()) as { id: string; physical_index: string } | undefined
    if (!primary || primary.physical_index !== this.expectedPrimaryIndex) {
      throw new InvariantViolationException('notification_projection_primary_confirmation_mismatch')
    }

    const admin = new NotificationProjectionAdminRepository()
    const [readIndices, writeIndices] = await Promise.all([
      admin.aliasIndices(DEFAULT_NOTIFICATION_READ_ALIAS),
      admin.aliasIndices(DEFAULT_NOTIFICATION_WRITE_ALIAS),
    ])
    if (
      !aliasesPointOnlyTo(readIndices, this.expectedCurrentIndex) ||
      !aliasesPointOnlyTo(writeIndices, this.expectedCurrentIndex)
    ) {
      throw new InvariantViolationException('notification_projection_alias_repair_state_mismatch')
    }

    await admin.swapAliases({
      sourceIndex: this.expectedCurrentIndex,
      targetIndex: this.expectedPrimaryIndex,
      readAlias: DEFAULT_NOTIFICATION_READ_ALIAS,
      writeAlias: DEFAULT_NOTIFICATION_WRITE_ALIAS,
    })

    const execCtx = {
      userId: actor.id,
      ip: '0.0.0.0',
      userAgent: 'notification-projection-alias-repair-cli',
      organizationId: null,
      actorRoleSurface: actor.system_role,
      requestId: null,
      traceId: null,
      workflowId: 'notification_projection_alias_repair',
    }
    await auditPublicApi.write(execCtx, {
      action: 'notification_projection.alias_repaired',
      event_name: 'notification.projection.alias_repaired',
      event_family: 'notification_operations',
      module: 'notifications',
      subsystem: 'projection',
      workflow: 'notification_projection_alias_repair',
      stage: 'completed',
      severity: 'warning',
      outcome: 'success',
      actor_type: 'operator',
      entity_type: 'notification_projection_target',
      entity_id: primary.id,
      target_type: 'notification_projection_aliases',
      target_id: this.expectedPrimaryIndex,
      retention_class: 'security',
      critical: true,
      new_values: {
        actorId: actor.id,
        reason,
        previousIndex: this.expectedCurrentIndex,
        primaryIndex: this.expectedPrimaryIndex,
      },
    })
    this.logger.success(
      `Notification projection aliases repaired from ${this.expectedCurrentIndex} to ${this.expectedPrimaryIndex}`
    )
  }
}
