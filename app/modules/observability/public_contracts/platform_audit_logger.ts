import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'

export interface PlatformAuditLoggerPort {
  record(execCtx: AuditActionContext, event: PlatformEvent): Promise<void>
}

export type PlatformAuditLogger = PlatformAuditLoggerPort

let registeredLogger: PlatformAuditLoggerPort | undefined

export function registerPlatformAuditLogger(nextLogger: PlatformAuditLoggerPort): void {
  registeredLogger = nextLogger
}

function requireLogger(): PlatformAuditLoggerPort {
  if (!registeredLogger) {
    throw new InvariantViolationException('Platform audit logger has not been registered')
  }
  return registeredLogger
}

export const platformAuditLogger: PlatformAuditLoggerPort = {
  record: (execCtx, event) => requireLogger().record(execCtx, event),
}
