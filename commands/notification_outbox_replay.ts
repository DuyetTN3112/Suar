import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import {
  makePreviewNotificationOutboxDeadLettersQuery,
  makeReplayNotificationOutboxCommand,
} from '#composition/notification_operations_composition'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'
import type { NotificationOutboxReplaySelector } from '#modules/notifications/domain/notification_outbox'

function validatedSequence(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`)
  }
  return value
}

export default class NotificationOutboxReplayCommand extends BaseCommand {
  static override commandName = 'notification:outbox-replay'
  static override description =
    'Replay selected notification dead-letter jobs with authorization and immutable audit'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({ description: 'Authenticated operator user UUID' })
  declare actorId?: string

  @flags.string({ description: 'Required operator reason (10-500 characters)' })
  declare reason?: string

  @flags.string({ description: 'Comma-separated outbox UUIDs (maximum 100)' })
  declare ids?: string

  @flags.number({ description: 'Inclusive lower outbox sequence' })
  declare fromSequence?: number

  @flags.number({ description: 'Inclusive upper outbox sequence' })
  declare toSequence?: number

  @flags.string({ description: 'Only replay this sanitized error class' })
  declare errorClass?: string

  @flags.boolean({
    description: 'Apply the replay; omission performs an audited bounded preview',
  })
  declare apply: boolean

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
    const selector: NotificationOutboxReplaySelector = {
      ...(parsedIds === undefined ? {} : { ids: [...new Set(parsedIds)] }),
      ...(this.fromSequence === undefined
        ? {}
        : { fromSequence: validatedSequence(this.fromSequence, 'fromSequence') }),
      ...(this.toSequence === undefined
        ? {}
        : { toSequence: validatedSequence(this.toSequence, 'toSequence') }),
      ...(this.errorClass === undefined ? {} : { errorClass: this.errorClass }),
    }
    if (
      selector.ids === undefined &&
      selector.fromSequence === undefined &&
      selector.toSequence === undefined &&
      selector.errorClass === undefined
    ) {
      this.logger.error('Replay requires a bounded selector')
      this.exitCode = 1
      return
    }
    const execCtx = {
      userId: actor.id,
      ip: '0.0.0.0',
      userAgent: 'notification-outbox-replay-cli',
      organizationId: null,
      actorRoleSurface: actor.system_role,
      requestId: null,
      traceId: null,
      workflowId: 'notification_outbox_replay',
    }
    if (!this.apply) {
      const preview = await makePreviewNotificationOutboxDeadLettersQuery().execute(
        {
          selector,
          limit: 100,
        },
        execCtx
      )
      this.logger.info(
        `Notification outbox replay preview affected_at_most=${String(
          preview.items.length
        )} ids=${preview.items.map((item) => item.id).join(',')} has_more=${String(
          preview.hasMore
        )}`
      )
      if (preview.hasMore) {
        this.logger.warning('Replay selector exceeds the hard cap of 100; narrow the selector')
        this.exitCode = 2
      }
      return
    }
    const result = await makeReplayNotificationOutboxCommand().execute(
      {
        selector,
        reason: this.reason,
      },
      execCtx
    )

    this.logger.success(
      `Notification outbox replay accepted affected=${String(
        result.affectedCount
      )} ids=${result.outboxIds.join(',')}`
    )
  }
}
