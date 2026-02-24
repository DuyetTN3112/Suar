import emitter from '@adonisjs/core/services/emitter'

import type { AuditLogEvent } from '#modules/audit/events/audit_events'
import { redactAuditValue } from '#modules/audit/public_contracts/audit_event_redaction'
import {
  sanitizeErrorDetails,
  sanitizeErrorText,
} from '#modules/errors/public_contracts/error_sanitization'
import loggerService from '#modules/logger/public_contracts/application_logger'

export interface AuditLogListenerDependencies {
  write(event: AuditLogEvent): Promise<void>
  logger: Pick<typeof loggerService, 'error'>
}

const defaultDependencies: AuditLogListenerDependencies = {
  write: async (event) => {
    const { auditRepositoryProvider } =
      await import('#modules/audit/infra/repositories/audit_repository_provider')
    const repo = auditRepositoryProvider.getAuditLogRepository()

    await repo.create({
      user_id: event.userId,
      action: event.action,
      entity_type: event.entityType ?? '',
      entity_id:
        event.entityId !== null && event.entityId !== undefined ? String(event.entityId) : null,
      old_values: event.oldValues ?? null,
      new_values: event.newValues ?? null,
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
      redaction_applied: event.redactionApplied ?? false,
    })
  },
  logger: loggerService,
}

function normalizeValues(value: Record<string, unknown> | null | undefined): {
  value: Record<string, unknown> | null
  redactionApplied: boolean
} {
  if (value === null || value === undefined) {
    return { value: null, redactionApplied: false }
  }
  const bounded = sanitizeErrorDetails(value)
  const redacted = redactAuditValue(bounded)
  return {
    value:
      redacted.value && typeof redacted.value === 'object' && !Array.isArray(redacted.value)
        ? (redacted.value as Record<string, unknown>)
        : null,
    redactionApplied: redacted.redactionApplied,
  }
}

function normalizeEvent(event: AuditLogEvent): AuditLogEvent {
  const oldValues = normalizeValues(event.oldValues)
  const newValues = normalizeValues(event.newValues)
  return {
    userId: event.userId === null ? null : sanitizeErrorText(event.userId, 128),
    action: sanitizeErrorText(event.action, 128),
    ...(event.entityType === undefined
      ? {}
      : { entityType: sanitizeErrorText(event.entityType, 128) }),
    ...(event.entityId === undefined
      ? {}
      : {
          entityId: event.entityId === null ? null : sanitizeErrorText(String(event.entityId), 256),
        }),
    ...(event.ipAddress === undefined ? {} : { ipAddress: sanitizeErrorText(event.ipAddress, 64) }),
    ...(event.userAgent === undefined
      ? {}
      : { userAgent: sanitizeErrorText(event.userAgent, 512) }),
    oldValues: oldValues.value,
    newValues: newValues.value,
    redactionApplied: oldValues.redactionApplied || newValues.redactionApplied,
  }
}

/**
 * Audit Log Listener — ghi nhật ký hành động async.
 *
 * Thay thế MySQL stored procedure: log_audit()
 * Pattern: Event-driven, non-blocking, fire-and-forget
 *
 * Uses the audit module repository provider.
 */
export async function handleAuditLogEvent(
  event: AuditLogEvent,
  dependencies: AuditLogListenerDependencies = defaultDependencies
): Promise<void> {
  let normalizedEvent: AuditLogEvent | null = null
  try {
    normalizedEvent = normalizeEvent(event)
    await dependencies.write(normalizedEvent)
  } catch (error) {
    try {
      dependencies.logger.error('Audit log write failed', {
        userId: normalizedEvent?.userId ?? null,
        action: normalizedEvent?.action ?? 'unavailable',
        errorName: error instanceof Error ? error.name : 'UnknownError',
      })
    } catch {
      // Telemetry failure must not replace the audit persistence failure.
    }
    throw error
  }
}

emitter.on('audit:log', handleAuditLogEvent)
