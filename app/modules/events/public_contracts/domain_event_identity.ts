import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9:._-]{0,127}$/u
const MAX_IDENTITY_PART_LENGTH = 512

export interface DomainEventIdentityInput {
  eventName: string
  aggregateId: string
  businessEventId: string
}

export interface DomainEventCryptographyProvider {
  derive(identity: string): string
  digest(canonicalValue: string): string
}

let provider: DomainEventCryptographyProvider | null = null

export function registerDomainEventCryptographyProvider(
  implementation: DomainEventCryptographyProvider
): void {
  provider = implementation
}

export function digestDomainEventCanonicalValue(canonicalValue: string): string {
  if (!provider) {
    throw new InvariantViolationException(
      'Domain event cryptography provider has not been registered'
    )
  }
  return provider.digest(canonicalValue)
}

function validatePart(value: string, name: string): string {
  if (value.length < 1 || value.length > MAX_IDENTITY_PART_LENGTH) {
    throw new RangeError(`${name} must contain 1 to 512 characters`)
  }
  return value
}

export function buildDomainEventId(input: DomainEventIdentityInput): string {
  if (!EVENT_NAME_PATTERN.test(input.eventName)) {
    throw new InvariantViolationException(
      'Domain event name must be a bounded lowercase identifier'
    )
  }
  const identity = JSON.stringify([
    input.eventName,
    validatePart(input.aggregateId, 'aggregateId'),
    validatePart(input.businessEventId, 'businessEventId'),
  ])
  if (!provider) {
    throw new InvariantViolationException(
      'Domain event identity provider has not been registered'
    )
  }
  return provider.derive(identity)
}
