import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import loggerService from '#modules/logger/public_contracts/application_logger'
import { platformAuditLogger } from '#modules/observability/infra/loggers/platform_audit_logger'
import { platformOperationalLogger } from '#modules/observability/infra/loggers/platform_operational_logger'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'

interface WorkflowOperationalLogger {
  log(level: PlatformEvent['severity'], event: PlatformEvent): void
}

interface WorkflowAuditLogger {
  record(execCtx: AuditActionContext, event: PlatformEvent): Promise<void>
}

interface WorkflowFallbackLogger {
  logStructured(level: 'error', eventName: string, payload: Record<string, unknown>): void
}

export class PlatformWorkflowLogger {
  constructor(
    private readonly operationalLogger: WorkflowOperationalLogger = platformOperationalLogger,
    private readonly auditLogger: WorkflowAuditLogger = platformAuditLogger,
    private readonly fallbackLogger: WorkflowFallbackLogger = loggerService
  ) {}

  async checkpoint(execCtx: AuditActionContext, event: PlatformEvent): Promise<void> {
    this.operationalLogger.log(event.severity, event)
    await this.auditLogger.record(execCtx, event)
  }

  async checkpointSafely(execCtx: AuditActionContext, event: PlatformEvent): Promise<void> {
    try {
      this.operationalLogger.log(event.severity, event)
    } catch (error) {
      this.reportSinkFailure('operational', event, error)
    }

    try {
      await this.auditLogger.record(execCtx, event)
    } catch (error) {
      this.reportSinkFailure('audit', event, error)
    }
  }

  private reportSinkFailure(
    sink: 'audit' | 'operational',
    event: PlatformEvent,
    error: unknown
  ): void {
    try {
      this.fallbackLogger.logStructured('error', `platform.${sink}.record_failed`, {
        module: event.module,
        workflow: event.workflow,
        event_name: event.event_name,
        error_class: error instanceof Error ? error.name : 'UnknownError',
      })
    } catch {
      // Observability failures must never alter an already committed workflow result.
    }
  }
}

export const platformWorkflowLogger = new PlatformWorkflowLogger()
