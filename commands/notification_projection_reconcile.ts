import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import { makeReconcileNotificationProjectionCommand } from '#composition/notification_projection_composition'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'

export default class NotificationProjectionReconcileCommand extends BaseCommand {
  static override commandName = 'notification:projection-reconcile'
  static override description =
    'Compare canonical notification IDs/revisions with the primary Elasticsearch index'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({ description: 'Authenticated operator user UUID' })
  declare actorId?: string

  @flags.string({ description: 'Required operator reason (10-500 characters)' })
  declare reason?: string

  @flags.boolean({
    description: 'Report-only safety mode; never repair missing or stale documents',
  })
  declare sample: boolean

  @flags.boolean({
    description: 'Repair missing/stale rows and purge bounded extra documents',
  })
  declare repair: boolean

  override async run(): Promise<void> {
    if (!this.actorId || !this.reason) {
      this.logger.error('--actor-id and --reason are required')
      this.exitCode = 1
      return
    }
    if (this.sample && this.repair) {
      this.logger.error('--sample and --repair are mutually exclusive')
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

    const report = await makeReconcileNotificationProjectionCommand().execute({
      actorId: actor.id,
      reason: this.reason,
      repair: this.repair,
    })
    this.logger.info(
      JSON.stringify({
        component: 'notification_projection_reconciliation',
        mode: this.repair ? 'repair' : 'report_only',
        report,
      })
    )
    if (!report.passed) {
      this.logger.error('Notification projection reconciliation has unresolved mismatches')
      this.exitCode = 2
    } else {
      this.logger.success('Notification projection reconciliation passed')
    }
  }
}
