import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import { makePromoteNotificationProjectionCommand } from '#composition/notifications/notification-feed/notification_projection_composition'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'

export default class NotificationProjectionPromoteCommand extends BaseCommand {
  static override commandName = 'notification:projection-promote'
  static override description =
    'Explicitly promote a reconciled notification projection with exact target confirmation'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({ description: 'Authenticated operator user UUID' })
  declare actorId?: string

  @flags.string({ description: 'Ready notification projection run UUID' })
  declare runId?: string

  @flags.string({ description: 'Required change-approval reason (10-500 characters)' })
  declare reason?: string

  @flags.string({ description: 'Exact physical target index confirmation' })
  declare expectedTargetIndex?: string

  override async run(): Promise<void> {
    if (!this.actorId || !this.runId || !this.reason || !this.expectedTargetIndex) {
      this.logger.error('--actor-id, --run-id, --reason, and --expected-target-index are required')
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
      userAgent: 'notification-projection-promote-cli',
      organizationId: null,
      actorRoleSurface: actor.system_role,
      requestId: null,
      traceId: null,
      workflowId: 'notification_projection_promotion',
    }
    const result = await makePromoteNotificationProjectionCommand().execute({
      runId: this.runId,
      actorId: actor.id,
      reason: this.reason,
      expectedTargetIndex: this.expectedTargetIndex,
    })
    await auditPublicApi.write(execCtx, {
      action: 'notification_projection.promoted',
      event_name: 'notification.projection.promoted',
      event_family: 'notification_operations',
      module: 'notifications',
      subsystem: 'projection',
      workflow: 'notification_projection_promotion',
      stage: 'completed',
      severity: 'warning',
      outcome: 'success',
      actor_type: 'operator',
      entity_type: 'notification_projection_run',
      entity_id: result.run.id,
      target_type: 'notification_projection_index',
      target_id: result.run.targetIndex,
      retention_class: 'security',
      critical: true,
      new_values: {
        actorId: actor.id,
        reason: this.reason.trim(),
        runId: result.run.id,
        targetIndex: result.run.targetIndex,
        resultingStatus: result.status,
      },
    })
    this.logger.success(
      `Notification projection promotion completed run=${result.run.id} target=${result.run.targetIndex}`
    )
  }
}
