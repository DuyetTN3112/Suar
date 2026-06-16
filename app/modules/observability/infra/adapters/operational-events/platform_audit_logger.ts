import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type { PlatformAuditLoggerPort } from '#modules/observability/public_contracts/platform_audit_logger'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'
import { redactSensitiveObject } from '#modules/observability/public_contracts/platform_redaction'

export class PlatformAuditLoggerAdapter implements PlatformAuditLoggerPort {
  async record(execCtx: AuditActionContext, event: PlatformEvent): Promise<void> {
    const { value, redactionApplied } = redactSensitiveObject(
      event as unknown as Record<string, unknown>
    )
    const payload = {
      ...value,
      compliance: {
        ...(typeof value['compliance'] === 'object' && value['compliance'] !== null
          ? (value['compliance'] as Record<string, unknown>)
          : {}),
        redaction_applied: redactionApplied || event.compliance.redaction_applied,
      },
    }

    await auditPublicApi.writeAllowAnonymous(execCtx, {
      action: event.event_name,
      entity_type: event.target?.type ?? event.module,
      entity_id: event.target?.id ?? null,
      user_id: event.actor.user_id ?? execCtx.userId,
      event_name: event.event_name,
      event_family: event.event_family,
      module: event.module,
      subsystem: event.subsystem,
      workflow: event.workflow,
      stage: event.stage,
      severity: event.severity,
      outcome: event.outcome,
      actor_type: event.actor.initiator_type,
      target_type: event.target?.type ?? event.module,
      retention_class: event.compliance.retention_class,
      redaction_applied: redactionApplied || event.compliance.redaction_applied,
      ...(event.actor.role_surface ? { actor_role_surface: event.actor.role_surface } : {}),
      ...(event.target?.id ? { target_id: event.target.id } : {}),
      ...(event.trace.correlation_key ? { correlation_key: event.trace.correlation_key } : {}),
      new_values: payload,
    })
  }
}
