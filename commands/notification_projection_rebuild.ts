import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import { makeRebuildNotificationProjectionCommand } from '#composition/notification_projection_composition'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'

export default class NotificationProjectionRebuildCommand extends BaseCommand {
  static override commandName = 'notification:projection-rebuild'
  static override description =
    'Plan, resume, backfill, and reconcile a versioned notification index before promotion'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({ description: 'Authenticated operator user UUID' })
  declare actorId?: string

  @flags.string({ description: 'Required operator reason (10-500 characters)' })
  declare reason?: string

  @flags.boolean({ description: 'Read-only plan; do not create an index or mutate state' })
  declare dryRun: boolean

  @flags.number({ description: 'PostgreSQL/Elasticsearch batch size (10-500)' })
  declare batchSize?: number

  override async run(): Promise<void> {
    if (!this.actorId || !this.reason) {
      this.logger.error('--actor-id and --reason are required')
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

    const result = await makeRebuildNotificationProjectionCommand().execute({
      actorId: actor.id,
      reason: this.reason,
      dryRun: this.dryRun,
      ...(this.batchSize === undefined ? {} : { batchSize: this.batchSize }),
    })
    this.logger.info(
      JSON.stringify({
        component: 'notification_projection_rebuild',
        ...result,
      })
    )

    if (result.status === 'waiting_for_catchup') {
      this.logger.warning(
        'Projection rebuild is durable and resumable; run the outbox worker, resolve DLQ if any, then rerun this command'
      )
      this.exitCode = 2
    } else if (result.status === 'reconciliation_blocked') {
      this.logger.error('Projection cutover was blocked by unresolved reconciliation mismatches')
      this.exitCode = 2
    } else if (result.status === 'ready_for_promotion') {
      this.logger.success(
        `Notification projection is ready for explicit promotion run=${result.run.id} target=${result.run.targetIndex}`
      )
    }
  }
}
