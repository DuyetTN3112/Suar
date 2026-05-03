import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import { makeRollbackNotificationProjectionCommand } from '#composition/notifications/notification-feed/notification_projection_composition'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'

export default class NotificationProjectionRollbackCommand extends BaseCommand {
  static override commandName = 'notification:projection-rollback'
  static override description =
    'Rollback both notification aliases to a caught-up eligible target within its rollback window'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({ description: 'Authenticated operator user UUID' })
  declare actorId?: string

  @flags.string({ description: 'Required incident/change reason (10-500 characters)' })
  declare reason?: string

  @flags.string({ description: 'Exact current primary physical index confirmation' })
  declare expectedCurrentIndex?: string

  @flags.string({ description: 'Exact rollback target physical index' })
  declare rollbackTargetIndex?: string

  override async run(): Promise<void> {
    if (!this.actorId || !this.reason || !this.expectedCurrentIndex || !this.rollbackTargetIndex) {
      this.logger.error(
        '--actor-id, --reason, --expected-current-index, and --rollback-target-index are required'
      )
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

    const execCtx = {
      userId: actor.id,
      ip: '0.0.0.0',
      userAgent: 'notification-projection-rollback-cli',
      organizationId: null,
      actorRoleSurface: actor.system_role,
      requestId: null,
      traceId: null,
      workflowId: 'notification_projection_rollback',
    }
    const result = await makeRollbackNotificationProjectionCommand().execute({
      actorId: actor.id,
      reason: this.reason,
      expectedCurrentIndex: this.expectedCurrentIndex,
      rollbackTargetIndex: this.rollbackTargetIndex,
    })
    await auditPublicApi.write(execCtx, {
      action: 'notification_projection.rolled_back',
      event_name: 'notification.projection.rolled_back',
      event_family: 'notification_operations',
      module: 'notifications',
      subsystem: 'projection',
      workflow: 'notification_projection_rollback',
      stage: 'completed',
      severity: 'critical',
      outcome: 'success',
      actor_type: 'operator',
      entity_type: 'notification_projection_index',
      entity_id: result.primaryIndex,
      target_type: 'notification_projection_index',
      target_id: result.primaryIndex,
      retention_class: 'security',
      critical: true,
      new_values: {
        actorId: actor.id,
        reason: this.reason.trim(),
        previousPrimaryIndex: result.previousPrimaryIndex,
        primaryIndex: result.primaryIndex,
        resultingStatus: result.status,
      },
    })
    this.logger.success(
      `Notification projection rollback ${result.status} previous=${result.previousPrimaryIndex} primary=${result.primaryIndex}`
    )
  }
}
