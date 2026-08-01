import { createHash } from 'node:crypto'

import type { AuditEventHashProvider } from '#modules/audit/public_contracts/audit_event_hash'

export class NodeAuditEventHashProvider implements AuditEventHashProvider {
  digest(canonicalPayload: string): string {
    return createHash('sha256').update(canonicalPayload, 'utf8').digest('hex')
  }
}
