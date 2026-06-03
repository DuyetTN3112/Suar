import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { LogLevel } from '#modules/logger/public_contracts/application_logger'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'

export interface PlatformOperationalLoggerPort {
  log(level: LogLevel, event: PlatformEvent): void
}

export type PlatformOperationalLogger = PlatformOperationalLoggerPort

let registeredLogger: PlatformOperationalLoggerPort | undefined

export function registerPlatformOperationalLogger(
  nextLogger: PlatformOperationalLoggerPort
): void {
  registeredLogger = nextLogger
}

function requireLogger(): PlatformOperationalLoggerPort {
  if (!registeredLogger) {
    throw new InvariantViolationException('Platform operational logger has not been registered')
  }
  return registeredLogger
}

export const platformOperationalLogger: PlatformOperationalLoggerPort = {
  log: (level, event) => requireLogger().log(level, event),
}
