import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'

/** Observability capability required by project membership use cases. */
export interface ProjectMembershipObservability {
  log(level: PlatformEvent['severity'], event: PlatformEvent): void
  checkpointSafely(execCtx: AuditActionContext, event: PlatformEvent): Promise<void>
}
