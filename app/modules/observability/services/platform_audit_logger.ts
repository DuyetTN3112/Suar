import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type { PlatformEvent } from '#modules/observability/contracts/platform_event'
import { redactSensitiveObject } from '#modules/observability/services/platform_redaction'

export class PlatformAuditLogger {
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
      user_id: execCtx.userId,
      new_values: payload,
    })
  }
}

export const platformAuditLogger = new PlatformAuditLogger()
