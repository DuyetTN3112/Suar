import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import {
  makeDiscardNotificationOutboxDeadLettersCommand,
  makePreviewNotificationOutboxDeadLettersQuery,
} from '#composition/notification_operations_composition'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'
import type {
  NotificationOutboxDestination,
  NotificationOutboxReplaySelector,
} from '#modules/notifications/domain/notification_outbox'
import {
  NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT,
  type NotificationOutboxDeadLetterPreviewItem,
} from '#modules/notifications/domain/notification_outbox_dlq'

function positiveSequence(value: number | undefined, name: string): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`)
  }
  return value
}

function parseIds(value: string | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined
  }
  return [
    ...new Set(
      value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    ),
  ]
}

function parseDestination(value: string | undefined): NotificationOutboxDestination | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value !== 'feed_search' && value !== 'unread_cache') {
    throw new RangeError('destination must be feed_search or unread_cache')
  }
  return value
}

function serializeItem(item: NotificationOutboxDeadLetterPreviewItem) {
  return {
    id: item.id,
    sequence: item.sequence,
    destination: item.destination,
    attemptCount: item.attemptCount,
    errorClass: item.errorClass,
    deadLetteredAt: item.deadLetteredAt.toISOString(),
  }
}

export default class NotificationOutboxDlqCommand extends BaseCommand {
  static override commandName = 'notification:outbox-dlq'
  static override description =
    'Preview bounded notification outbox DLQ metadata or explicitly discard irreparable rows'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({ description: 'Authenticated operator user UUID' })
  declare actorId?: string

  @flags.string({ description: 'Comma-separated outbox UUIDs (maximum 100)' })
  declare ids?: string

  @flags.number({ description: 'Inclusive lower outbox sequence' })
  declare fromSequence?: number

  @flags.number({ description: 'Inclusive upper outbox sequence' })
  declare toSequence?: number

  @flags.number({ description: 'Continue listing after this sequence' })
  declare afterSequence?: number

  @flags.string({ description: 'Only list this sanitized error class' })
  declare errorClass?: string

  @flags.string({ description: 'Only list feed_search or unread_cache' })
  declare destination?: string

  @flags.number({
    description: `Preview page size (1-${NOTIFICATION_OUTBOX_ADMIN_BATCH_LIMIT})`,
    default: 50,
  })
  declare limit: number

  @flags.boolean({ description: 'Terminally discard the explicit --ids selection' })
  declare discard: boolean

  @flags.string({ description: 'Required discard reason (10-500 characters)' })
  declare reason?: string

  @flags.string({ description: 'Required exact discard confirmation: DISCARD' })
  declare confirmation?: string

  @flags.boolean({ description: 'Emit machine-readable JSON' })
  declare json: boolean

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

    const ids = parseIds(this.ids)
    const execCtx = {
      userId: actor.id,
      ip: '0.0.0.0',
      userAgent: 'notification-outbox-dlq-cli',
      organizationId: null,
      actorRoleSurface: actor.system_role,
      requestId: null,
      traceId: null,
      workflowId: 'notification_outbox_dlq_administration',
    }
    if (this.discard) {
      if (
        ids === undefined ||
        !this.reason ||
        this.confirmation !== 'DISCARD' ||
        this.fromSequence !== undefined ||
        this.toSequence !== undefined ||
        this.afterSequence !== undefined ||
        this.errorClass !== undefined ||
        this.destination !== undefined
      ) {
        this.logger.error('Discard requires only --ids, --reason, and --confirmation=DISCARD')
        this.exitCode = 1
        return
      }
      const result = await makeDiscardNotificationOutboxDeadLettersCommand().execute(
        {
          ids,
          reason: this.reason,
          confirmation: this.confirmation,
        },
        execCtx
      )
      this.logger.success(
        `Notification outbox disposition completed affected=${String(
          result.affectedCount
        )} ids=${result.outboxIds.join(',')}`
      )
      return
    }

    const fromSequence = positiveSequence(this.fromSequence, 'fromSequence')
    const toSequence = positiveSequence(this.toSequence, 'toSequence')
    const afterSequence = positiveSequence(this.afterSequence, 'afterSequence')
    const destination = parseDestination(this.destination)
    const selector: NotificationOutboxReplaySelector = {
      ...(ids === undefined ? {} : { ids }),
      ...(fromSequence === undefined ? {} : { fromSequence }),
      ...(toSequence === undefined ? {} : { toSequence }),
      ...(this.errorClass === undefined ? {} : { errorClass: this.errorClass }),
    }
    const page = await makePreviewNotificationOutboxDeadLettersQuery().execute(
      {
        selector,
        limit: this.limit,
        ...(afterSequence === undefined ? {} : { afterSequence }),
        ...(destination === undefined ? {} : { destination }),
      },
      execCtx
    )
    const output = {
      items: page.items.map(serializeItem),
      hasMore: page.hasMore,
      nextAfterSequence: page.nextAfterSequence,
    }
    if (this.json) {
      this.logger.info(JSON.stringify(output))
      return
    }
    for (const item of output.items) {
      this.logger.info(
        `id=${item.id} sequence=${String(item.sequence)} destination=${
          item.destination
        } attempts=${String(item.attemptCount)} error_class=${
          item.errorClass
        } dead_lettered_at=${item.deadLetteredAt}`
      )
    }
    this.logger.info(
      `has_more=${String(output.hasMore)} next_after_sequence=${String(
        output.nextAfterSequence ?? ''
      )}`
    )
  }
}
