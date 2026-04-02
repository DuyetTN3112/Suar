import type { AcceptNotificationCommand } from './accept_notification_command.js'

import type { NotificationAcceptanceResult } from '#modules/notifications/actions/dtos/notification_acceptance_result'
import type { NotificationTransactionRunner } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type {
  NotificationDigestGenerator,
  NotificationIdentityGenerator,
} from '#modules/notifications/actions/ports/outbound/notification_cryptography'
import {
  validateLegacyNotification,
  type LegacyNotificationInput,
} from '#modules/notifications/domain/legacy_notification_contract'
import type { NotificationCommandV1Input } from '#modules/notifications/domain/notification_command'

export class AcceptLegacyNotificationCommand {
  constructor(
    private readonly canonicalAcceptance: Pick<AcceptNotificationCommand, 'stage'>,
    private readonly digestGenerator: NotificationDigestGenerator,
    private readonly identityGenerator: NotificationIdentityGenerator,
    private readonly transactionRunner: NotificationTransactionRunner
  ) {}

  async execute(input: LegacyNotificationInput): Promise<NotificationAcceptanceResult> {
    const legacy = validateLegacyNotification(input, {
      digest: (canonicalValue) => this.digestGenerator.digest(canonicalValue),
      nextEventId: () => this.identityGenerator.next(),
    })
    const command: NotificationCommandV1Input = {
      eventId: legacy.eventId,
      type: legacy.input.type,
      schemaVersion: 1,
      recipientId: legacy.input.user_id,
      scope: { kind: 'user', id: legacy.input.user_id },
      parameters: {
        legacySnapshotHash: legacy.snapshotHash,
        nonIdempotentLegacy: legacy.nonIdempotent,
      },
      occurredAt: legacy.occurredAt,
      ...(legacy.input.related_entity_type && legacy.input.related_entity_id
        ? {
            subject: {
              type: legacy.input.related_entity_type,
              id: legacy.input.related_entity_id,
            },
          }
        : {}),
      ...(legacy.input.correlation_id ? { correlationId: legacy.input.correlation_id } : {}),
      ...(legacy.input.dedupe_key ? { dedupeKey: legacy.input.dedupe_key } : {}),
    }
    const staged = await this.transactionRunner.run((trx) =>
      this.canonicalAcceptance.stage(command, {
        trx,
        snapshotTextOverride: {
          title: legacy.input.title,
          message: legacy.input.message,
        },
      })
    )
    return {
      ...staged,
      status: 'accepted',
    }
  }
}
