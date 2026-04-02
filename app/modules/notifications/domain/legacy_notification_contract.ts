import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { LegacyNotificationInput } from '#modules/notifications/public_contracts/legacy_notification'

export type { LegacyNotificationInput }

export interface ValidatedLegacyNotification {
  input: LegacyNotificationInput
  eventId: string
  occurredAt: string
  snapshotHash: string
  nonIdempotent: boolean
}

export interface LegacyNotificationValidationOptions {
  digest(canonicalValue: string): string
  nextEventId(): string
  now?: Date
}

const utf8Encoder = new TextEncoder()

function assertTextLimit(
  value: string,
  label: string,
  maximumCharacters: number,
  maximumBytes: number
): void {
  if (value.length === 0) {
    throw new InvariantViolationException(`${label} must not be empty`)
  }
  if (value.length > maximumCharacters) {
    throw new InvariantViolationException(`${label} exceeds ${maximumCharacters} characters`)
  }
  if (utf8Encoder.encode(value).byteLength > maximumBytes) {
    throw new InvariantViolationException(`${label} exceeds ${maximumBytes} UTF-8 bytes`)
  }
}

export function validateLegacyNotification(
  input: LegacyNotificationInput,
  options: LegacyNotificationValidationOptions
): ValidatedLegacyNotification {
  assertTextLimit(input.title, 'Legacy notification title', 240, 1_024)
  assertTextLimit(input.message, 'Legacy notification message', 4_096, 4_096)

  const eventId = input.event_id ?? options.nextEventId()
  const occurredAt = input.occurred_at ?? (options.now ?? new Date()).toISOString()
  const snapshotHash = options.digest(
    JSON.stringify({
      title: input.title,
      message: input.message,
      relatedEntityType: input.related_entity_type ?? null,
      relatedEntityId: input.related_entity_id ?? null,
    })
  )

  return {
    input,
    eventId,
    occurredAt,
    snapshotHash,
    nonIdempotent: input.event_id === undefined,
  }
}
