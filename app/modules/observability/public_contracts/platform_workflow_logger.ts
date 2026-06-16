import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'

export interface PlatformWorkflowLoggerPort {
  checkpoint(execCtx: AuditActionContext, event: PlatformEvent): Promise<void>
  checkpointSafely(execCtx: AuditActionContext, event: PlatformEvent): Promise<void>
}

export type PlatformWorkflowLogger = PlatformWorkflowLoggerPort

let registeredLogger: PlatformWorkflowLoggerPort | undefined

export function registerPlatformWorkflowLogger(nextLogger: PlatformWorkflowLoggerPort): void {
  registeredLogger = nextLogger
}

function requireLogger(): PlatformWorkflowLoggerPort {
  if (!registeredLogger) {
    throw new InvariantViolationException('Platform workflow logger has not been registered')
  }
  return registeredLogger
}

export const platformWorkflowLogger: PlatformWorkflowLoggerPort = {
  checkpoint: (execCtx, event) => requireLogger().checkpoint(execCtx, event),
  checkpointSafely: (execCtx, event) => requireLogger().checkpointSafely(execCtx, event),
}
