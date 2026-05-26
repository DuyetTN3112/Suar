import type { AuditLogEvent } from '#modules/audit/events/audit_events'
import { sanitizeErrorText } from '#modules/errors/public_contracts/error_sanitization'
import type loggerService from '#modules/logger/public_contracts/application_logger'

export interface AuditLogListenerDependencies {
  processAuditLogEvent(event: AuditLogEvent): Promise<void>
  logger: Pick<typeof loggerService, 'error'>
}

/**
 * Event-facing adapter for audit log requests.
 *
 * Outer composition owns emitter registration and supplies the local command.
 */
export async function handleAuditLogEvent(
  event: AuditLogEvent,
  dependencies: AuditLogListenerDependencies
): Promise<void> {
  try {
    await dependencies.processAuditLogEvent(event)
  } catch (error) {
    try {
      dependencies.logger.error('Audit log write failed', {
        userId: event.userId === null ? null : sanitizeErrorText(event.userId, 128),
        action: sanitizeErrorText(event.action, 128),
        errorName: error instanceof Error ? error.name : 'UnknownError',
      })
    } catch {
      // Telemetry failure must not replace the audit persistence failure.
    }
    throw error
  }
}
