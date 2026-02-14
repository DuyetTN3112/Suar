import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_.-]{0,127}$/u
const MAX_IDENTITY_CHARACTERS = 512

export interface NotificationEventIdentityInput {
  eventName: string
  businessEventId: string
  recipientId: string
}

export interface NotificationEventIdentityProvider {
  derive(identity: string): string
}

let provider: NotificationEventIdentityProvider | null = null

export function registerNotificationEventIdentityProvider(
  implementation: NotificationEventIdentityProvider
): void {
  provider = implementation
}

function validateIdentityPart(value: string, label: string): string {
  if (value.length === 0 || value.length > MAX_IDENTITY_CHARACTERS) {
    throw new RangeError(`${label} must contain between 1 and 512 characters`)
  }
  return value
}

export function buildNotificationEventId(input: NotificationEventIdentityInput): string {
  if (!EVENT_NAME_PATTERN.test(input.eventName)) {
    throw new InvariantViolationException(
      'Notification event name must be a bounded lowercase domain event name'
    )
  }

  const identity = JSON.stringify([
    input.eventName,
    validateIdentityPart(input.businessEventId, 'Notification business event id'),
    validateIdentityPart(input.recipientId, 'Notification recipient id'),
  ])
  if (!provider) {
    throw new InvariantViolationException(
      'Notification event identity provider has not been registered'
    )
  }

  return provider.derive(identity)
}
