import type { NotificationTransaction } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type { NotificationDigestGenerator } from '#modules/notifications/actions/ports/outbound/notification_cryptography'
import type { NotificationFanoutStagingRepository } from '#modules/notifications/actions/ports/outbound/notification_fanout_staging_repository'
import { parseNotificationCommandV1 } from '#modules/notifications/domain/notification_command'
import type {
  NotificationFanoutStageResult,
  NotificationFanoutTemplateV1Input,
} from '#modules/notifications/domain/notification_fanout'
import {
  assertNotificationFanoutMaximum,
  assertNotificationFanoutScope,
  normalizeNotificationFanoutRecipients,
  notificationFanoutSemanticTemplate,
} from '#modules/notifications/domain/notification_fanout_policy'
import { canonicalNotificationJson } from '#modules/notifications/domain/notification_limits'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'

const DEFAULT_MAX_TARGETS = 10_000

export class StageNotificationFanoutCommand {
  private readonly maxTargets: number

  constructor(
    private readonly repository: NotificationFanoutStagingRepository,
    private readonly digestGenerator: NotificationDigestGenerator,
    options: { maxTargets?: number } = {}
  ) {
    this.maxTargets = options.maxTargets ?? DEFAULT_MAX_TARGETS
    assertNotificationFanoutMaximum(this.maxTargets)
  }

  async execute(
    input: NotificationFanoutTemplateV1Input,
    recipientIds: readonly string[],
    options: { trx: NotificationTransaction; now?: Date }
  ): Promise<NotificationFanoutStageResult> {
    const recipients = normalizeNotificationFanoutRecipients(recipientIds, this.maxTargets)
    const firstRecipient = recipients[0]
    if (!firstRecipient) {
      throw new RangeError('Notification fanout requires at least one target')
    }

    const parsed = parseNotificationCommandV1(
      {
        eventId: buildNotificationEventId({
          eventName: input.eventName,
          businessEventId: input.businessEventId,
          recipientId: firstRecipient,
        }),
        type: input.type,
        schemaVersion: input.schemaVersion,
        recipientId: firstRecipient,
        scope: input.scope,
        parameters: input.parameters,
        occurredAt: input.occurredAt,
        ...(input.actor === undefined ? {} : { actor: input.actor }),
        ...(input.subject === undefined ? {} : { subject: input.subject }),
        ...(input.correlationId === undefined ? {} : { correlationId: input.correlationId }),
        ...(input.dedupeKey === undefined ? {} : { dedupeKey: input.dedupeKey }),
      },
      {
        ...(options.now === undefined ? {} : { now: options.now }),
        digest: (canonicalValue) => this.digestGenerator.digest(canonicalValue),
      }
    )
    assertNotificationFanoutScope(parsed.command, recipients)

    return this.repository.stage(
      {
        template: input,
        command: parsed.command,
        recipients,
        templateFingerprint: this.digestGenerator.digest(
          canonicalNotificationJson(notificationFanoutSemanticTemplate(input, parsed.command))
        ),
        targetFingerprint: this.digestGenerator.digest(canonicalNotificationJson(recipients)),
        now: options.now ?? new Date(),
      },
      options.trx
    )
  }
}
