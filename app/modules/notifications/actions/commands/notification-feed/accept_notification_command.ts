import { BaseCommand } from '#modules/notifications/actions/base_command'
import type { NotificationAcceptanceResult } from '#modules/notifications/actions/dtos/notification_acceptance_result'
import type {
  NotificationAcceptanceRepository,
  NotificationTransaction,
  NotificationTransactionRunner,
} from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type { NotificationDigestGenerator } from '#modules/notifications/actions/ports/outbound/notification_cryptography'
import { getNotificationDefinition } from '#modules/notifications/domain/notification-feed/notification_catalog'
import {
  parseNotificationCommandV1,
  type NotificationCommandV1Input,
} from '#modules/notifications/domain/notification-feed/notification_command'
import { NotificationCanonicalStateError } from '#modules/notifications/domain/notification-feed/notification_contract_errors'
import {
  renderNotificationSnapshot,
  type RenderedNotificationSnapshot,
} from '#modules/notifications/domain/notification-feed/notification_renderer'
import { notificationRetentionDeadline } from '#modules/notifications/domain/notification-outbox/notification_retention_policy'

export class AcceptNotificationCommand extends BaseCommand<
  NotificationCommandV1Input,
  NotificationAcceptanceResult
> {
  constructor(
    private readonly repository: NotificationAcceptanceRepository,
    private readonly digestGenerator: NotificationDigestGenerator,
    private readonly transactionRunner: NotificationTransactionRunner
  ) {
    super()
  }

  async execute(
    input: NotificationCommandV1Input,
    options: { now?: Date } = {}
  ): Promise<NotificationAcceptanceResult> {
    const staged = await this.transactionRunner.run((trx) =>
      this.stage(input, {
        trx,
        ...(options.now === undefined ? {} : { now: options.now }),
      })
    )
    return {
      ...staged,
      status: 'accepted',
    }
  }

  async stage(
    input: NotificationCommandV1Input,
    options: {
      trx: NotificationTransaction
      now?: Date
      snapshotTextOverride?: Pick<RenderedNotificationSnapshot, 'title' | 'message'>
    }
  ): Promise<NotificationAcceptanceResult> {
    const parsed = parseNotificationCommandV1(input, {
      ...(options.now === undefined ? {} : { now: options.now }),
      digest: (canonicalValue) => this.digestGenerator.digest(canonicalValue),
    })
    const definition = getNotificationDefinition(parsed.command.type)
    if (!definition) {
      throw new NotificationCanonicalStateError(
        `Catalog definition disappeared for ${parsed.command.type}`
      )
    }
    const rendered = renderNotificationSnapshot(parsed.command)
    const persisted = await this.repository.stage(
      {
        command: parsed.command,
        fingerprint: parsed.fingerprint,
        snapshot: options.snapshotTextOverride
          ? { ...rendered, ...options.snapshotTextOverride }
          : rendered,
        category: definition.category,
        priority: definition.priority,
        templateKey: definition.templateKey,
        templateVersion: definition.templateVersion,
        retentionClass: definition.retentionClass,
        retentionUntil: notificationRetentionDeadline(
          definition.retentionClass,
          parsed.command.occurredAt
        ),
        acceptedAt: new Date(),
      },
      options.trx
    )

    return {
      status: 'staged',
      ...persisted,
    }
  }
}
