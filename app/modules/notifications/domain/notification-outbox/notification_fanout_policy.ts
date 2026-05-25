import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { NotificationCommandV1 } from '#modules/notifications/domain/notification-feed/notification_command'
import type { NotificationJsonValue } from '#modules/notifications/domain/notification-feed/notification_limits'
import type { NotificationFanoutTemplateV1Input } from '#modules/notifications/domain/notification-outbox/notification_fanout'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export class NotificationFanoutConflictError extends Error {
  readonly code = 'NOTIFICATION_FANOUT_CONFLICT'

  constructor(reason: 'template' | 'target_snapshot') {
    super(`Notification fanout conflict: the ${reason.replace('_', ' ')} changed`)
    this.name = 'NotificationFanoutConflictError'
  }
}

export function assertNotificationFanoutMaximum(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > 50_000) {
    throw new RangeError('Notification fanout maxTargets must be between 1 and 50000')
  }
}

export function normalizeNotificationFanoutRecipients(
  recipientIds: readonly string[],
  maximum: number
): string[] {
  const normalized = [
    ...new Set(recipientIds.map((recipientId) => recipientId.toLowerCase())),
  ].sort()

  if (normalized.length < 1 || normalized.length > maximum) {
    throw new RangeError(`Notification fanout targets must contain between 1 and ${maximum} users`)
  }
  for (const recipientId of normalized) {
    if (!UUID_PATTERN.test(recipientId)) {
      throw new InvariantViolationException('Notification fanout recipient id must be a UUID')
    }
  }
  return normalized
}

export function assertNotificationFanoutScope(
  command: NotificationCommandV1,
  recipients: readonly string[]
): void {
  const firstRecipient = recipients[0]
  if (!firstRecipient) {
    throw new InvariantViolationException('Notification fanout requires at least one target')
  }
  if (
    command.scope.kind === 'user' &&
    (recipients.length !== 1 || command.scope.id !== firstRecipient)
  ) {
    throw new InvariantViolationException(
      'User-scoped notification fanout must target exactly that scope user'
    )
  }
}

export function notificationFanoutSemanticTemplate(
  input: NotificationFanoutTemplateV1Input,
  command: NotificationCommandV1
): NotificationJsonValue {
  // `businessEventId` is the idempotency boundary for a fanout job. The
  // occurrence timestamp is operational metadata and may legitimately differ
  // when a caller retries the same business event (for example, an admin
  // resolution retried after a transaction-side failure). Keeping it out of
  // this fingerprint prevents a harmless retry from becoming a template
  // conflict while the first committed timestamp remains authoritative.
  return {
    eventName: input.eventName,
    businessEventId: input.businessEventId,
    type: command.type,
    schemaVersion: command.schemaVersion,
    scope: command.scope,
    actor: command.actor ?? null,
    subject: command.subject ?? null,
    parameters: command.parameters,
    dedupeKey: command.dedupeKey ?? null,
  }
}
