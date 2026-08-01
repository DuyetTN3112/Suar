import { createHash } from 'node:crypto'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { NotificationEventIdentityProvider } from '#modules/notifications/public_contracts/notification_event_identity'

/**
 * Permanent namespace for Suar notification event identities.
 *
 * Changing this value would break retry idempotency for already deployed producers.
 * SHA-1 is required by UUIDv5 and is used only for namespacing, not for security.
 */
const NOTIFICATION_EVENT_NAMESPACE = 'd35f7d20-19f7-5b65-86a8-20d9f07d3204'

function namespaceBytes(): Buffer {
  return Buffer.from(NOTIFICATION_EVENT_NAMESPACE.replaceAll('-', ''), 'hex')
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

export class NodeNotificationEventIdentityProvider implements NotificationEventIdentityProvider {
  derive(identity: string): string {
    const bytes = Buffer.from(
      createHash('sha1').update(namespaceBytes()).update(identity, 'utf8').digest().subarray(0, 16)
    )
    const versionByte = bytes.at(6)
    const variantByte = bytes.at(8)
    if (versionByte === undefined || variantByte === undefined) {
      throw new InvariantViolationException('Unable to derive notification event UUID')
    }

    bytes[6] = (versionByte & 0x0f) | 0x50
    bytes[8] = (variantByte & 0x3f) | 0x80
    return formatUuid(bytes)
  }
}
