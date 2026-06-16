import { createHash, randomUUID } from 'node:crypto'

import type { PlatformTraceIdentityProvider } from '#modules/observability/public_contracts/platform_trace_context'

export class NodePlatformTraceIdentityProvider implements PlatformTraceIdentityProvider {
  nextId(): string {
    return randomUUID()
  }

  digest(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex')
  }
}
