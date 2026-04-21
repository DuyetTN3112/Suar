import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'
import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_operational_logger'
import { platformWorkflowLogger } from '#modules/observability/public_contracts/platform_workflow_logger'
import type { ProjectMembershipObservability } from '#modules/projects/actions/ports/outbound/project_membership_observability'

export class ProjectMembershipObservabilityAdapter implements ProjectMembershipObservability {
  log(level: PlatformEvent['severity'], event: PlatformEvent): void {
    platformOperationalLogger.log(level, event)
  }

  checkpointSafely(execCtx: AuditActionContext, event: PlatformEvent): Promise<void> {
    return platformWorkflowLogger.checkpointSafely(execCtx, event)
  }
}
