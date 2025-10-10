import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { PlatformEvent } from '#modules/observability/contracts/platform_event'
import { platformAuditLogger } from '#modules/observability/services/platform_audit_logger'
import { platformOperationalLogger } from '#modules/observability/services/platform_operational_logger'

export class PlatformWorkflowLogger {
  async checkpoint(execCtx: AuditActionContext, event: PlatformEvent): Promise<void> {
    platformOperationalLogger.log(event.severity, event)
    await platformAuditLogger.record(execCtx, event)
  }

  async checkpointSafely(execCtx: AuditActionContext, event: PlatformEvent): Promise<void> {
    platformOperationalLogger.log(event.severity, event)

    try {
      await platformAuditLogger.record(execCtx, event)
    } catch (error) {
      loggerService.logStructured('error', 'platform.audit.record_failed', {
        module: event.module,
        workflow: event.workflow,
        event_name: event.event_name,
        error_class: error instanceof Error ? error.name : 'UnknownError',
        error_message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

export const platformWorkflowLogger = new PlatformWorkflowLogger()
