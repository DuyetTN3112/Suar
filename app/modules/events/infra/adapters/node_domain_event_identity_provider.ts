import { createHash } from 'node:crypto'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { DomainEventCryptographyProvider } from '#modules/events/public_contracts/domain_event_identity'

/**
 * Permanent UUIDv5 namespace. Changing it breaks idempotency for deployed producers.
 * SHA-1 is required by UUIDv5 and is not used as a security primitive.
 */
const DOMAIN_EVENT_NAMESPACE = '1a96e0ba-88d8-5e77-a362-a7334c47d9dd'

function namespaceBytes(): Buffer {
  return Buffer.from(DOMAIN_EVENT_NAMESPACE.replaceAll('-', ''), 'hex')
}

function formatUuid(bytes: Buffer): string {
  const hex = bytes.toString('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

export class NodeDomainEventIdentityProvider implements DomainEventCryptographyProvider {
  derive(identity: string): string {
    const bytes = Buffer.from(
      createHash('sha1').update(namespaceBytes()).update(identity, 'utf8').digest().subarray(0, 16)
    )
    const versionByte = bytes.at(6)
    const variantByte = bytes.at(8)
    if (versionByte === undefined || variantByte === undefined) {
      throw new InvariantViolationException('Unable to derive domain event UUID')
    }
    bytes[6] = (versionByte & 0x0f) | 0x50
    bytes[8] = (variantByte & 0x3f) | 0x80
    return formatUuid(bytes)
  }

  digest(canonicalValue: string): string {
    return createHash('sha256').update(canonicalValue, 'utf8').digest('hex')
  }
}
