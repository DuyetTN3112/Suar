import { BaseCommand } from '#modules/notifications/actions/base_command'
import type { NotificationTransaction } from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'
import type { NotificationDigestGenerator } from '#modules/notifications/actions/ports/outbound/notification_cryptography'
import type { NotificationFanoutStagingRepository } from '#modules/notifications/actions/ports/outbound/notification_fanout_staging_repository'
import { parseNotificationCommandV1 } from '#modules/notifications/domain/notification-feed/notification_command'
import type {
  NotificationFanoutStageResult,
  NotificationFanoutTemplateV1Input,
} from '#modules/notifications/domain/notification-outbox/notification_fanout'
import {
  assertNotificationFanoutMaximum,
  assertNotificationFanoutScope,
  normalizeNotificationFanoutRecipients,
  notificationFanoutSemanticTemplate,
} from '#modules/notifications/domain/notification-outbox/notification_fanout_policy'
import { canonicalNotificationJson } from '#modules/notifications/domain/notification-feed/notification_limits'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'

const DEFAULT_MAX_TARGETS = 10_000

export interface StageNotificationFanoutCommandOptions {
  readonly trx: NotificationTransaction
  readonly now?: Date
}

export interface StageNotificationFanoutCommandInput {
  readonly input: NotificationFanoutTemplateV1Input
  readonly recipientIds: readonly string[]
  readonly options: StageNotificationFanoutCommandOptions
}

export class StageNotificationFanoutCommand extends BaseCommand<
  StageNotificationFanoutCommandInput,
  NotificationFanoutStageResult
> {
  private readonly maxTargets: number

  constructor(
    private readonly repository: NotificationFanoutStagingRepository,
    private readonly digestGenerator: NotificationDigestGenerator,
    options: { maxTargets?: number } = {}
  ) {
    super()
    this.maxTargets = options.maxTargets ?? DEFAULT_MAX_TARGETS
    assertNotificationFanoutMaximum(this.maxTargets)
  }

  execute(input: StageNotificationFanoutCommandInput): Promise<NotificationFanoutStageResult>
  async execute(
    input: NotificationFanoutTemplateV1Input,
    recipientIds: readonly string[],
    options: StageNotificationFanoutCommandOptions
  ): Promise<NotificationFanoutStageResult>
  override async execute(
    inputOrCommandInput: NotificationFanoutTemplateV1Input | StageNotificationFanoutCommandInput,
    legacyRecipientIds?: readonly string[],
    legacyOptions?: StageNotificationFanoutCommandOptions
  ): Promise<NotificationFanoutStageResult> {
    let input: NotificationFanoutTemplateV1Input
    let recipientIds: readonly string[]
    let options: StageNotificationFanoutCommandOptions
    if ('input' in inputOrCommandInput) {
      input = inputOrCommandInput.input
      recipientIds = inputOrCommandInput.recipientIds
      options = inputOrCommandInput.options
    } else {
      if (!legacyRecipientIds || !legacyOptions) {
        throw new TypeError('Notification fanout staging requires recipients and transaction options')
      }
      input = inputOrCommandInput
      recipientIds = legacyRecipientIds
      options = legacyOptions
    }

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
