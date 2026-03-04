import { createHash, randomUUID } from 'node:crypto'

import type {
  NotificationDigestGenerator,
  NotificationIdentityGenerator,
} from '#modules/notifications/actions/ports/outbound/notification_cryptography'

export class NodeNotificationCryptography
  implements NotificationDigestGenerator, NotificationIdentityGenerator
{
  digest(canonicalValue: string): string {
    return createHash('sha256').update(canonicalValue, 'utf8').digest('hex')
  }

  next(): string {
    return randomUUID()
  }
}
