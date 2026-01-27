import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type { UserLoginEvent } from '#modules/users/public_contracts/user_events'

export async function onUserLoginAudit(event: UserLoginEvent): Promise<void> {
  try {
    const execCtx: AuditActionContext = {
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      organizationId: null,
    }

    await auditPublicApi.write(execCtx, {
      action: 'login',
      event_name: 'auth.login.succeeded',
      event_family: 'auth.session',
      module: 'auth',
      outcome: 'success',
      entity_type: 'user',
      entity_id: event.userId,
      user_id: event.userId,
      target_type: 'user',
      target_id: event.userId,
      new_values: { method: event.method },
      retention_class: 'user_security_2y',
      critical: true,
    })
  } catch (error) {
    try {
      loggerService.error('Audit listener: login event failed', {
        userId: event.userId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      })
    } catch {
      // Telemetry failure must not replace the audit persistence failure.
    }
    throw error
  }
}
