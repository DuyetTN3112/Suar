import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'

export interface HttpOperationalEventWriter {
  log(level: 'info' | 'warn', event: PlatformEvent): void
}
