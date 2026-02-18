import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import { makeReplayNotificationFanoutCommand } from '#composition/notification_operations_composition'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'
import type { NotificationFanoutReplaySelector } from '#modules/notifications/domain/notification_fanout'

function validatedSequence(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`)
  }
  return value
}

export default class NotificationFanoutReplayCommand extends BaseCommand {
  static override commandName = 'notification:fanout-replay'
  static override description =
    'Replay selected notification fanout dead letters with authorization and immutable audit'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({ description: 'Authenticated operator user UUID' })
  declare actorId?: string

  @flags.string({ description: 'Required operator reason (10-500 characters)' })
  declare reason?: string

  @flags.string({ description: 'Comma-separated fanout target UUIDs (maximum 100)' })
  declare ids?: string

  @flags.string({ description: 'Only targets belonging to this fanout job UUID' })
  declare jobId?: string

  @flags.number({ description: 'Inclusive lower target sequence' })
  declare fromSequence?: number

  @flags.number({ description: 'Inclusive upper target sequence' })
  declare toSequence?: number

  @flags.string({ description: 'Only replay this sanitized error class' })
  declare errorClass?: string

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

    const parsedIds = this.ids
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
    const selector: NotificationFanoutReplaySelector = {
      ...(parsedIds === undefined ? {} : { ids: [...new Set(parsedIds)] }),
      ...(this.jobId === undefined ? {} : { jobId: this.jobId }),
      ...(this.fromSequence === undefined
        ? {}
        : { fromSequence: validatedSequence(this.fromSequence, 'fromSequence') }),
      ...(this.toSequence === undefined
        ? {}
        : { toSequence: validatedSequence(this.toSequence, 'toSequence') }),
      ...(this.errorClass === undefined ? {} : { errorClass: this.errorClass }),
    }
    const result = await makeReplayNotificationFanoutCommand().execute(
      { selector, reason: this.reason },
      {
        userId: actor.id,
        ip: '0.0.0.0',
        userAgent: 'notification-fanout-replay-cli',
        organizationId: null,
        actorRoleSurface: actor.system_role,
        requestId: null,
        traceId: null,
        workflowId: 'notification_fanout_replay',
      }
    )
    this.logger.success(
      `Notification fanout replay accepted affected=${String(
        result.affectedCount
      )} ids=${result.targetIds.join(',')}`
    )
  }
}
