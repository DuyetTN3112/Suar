import { BaseCommand } from '#modules/audit/actions/base_command'
import type { AuditLogRepository } from '#modules/audit/actions/ports/outbound/audit_log_repository'
import type { AuditLogEvent } from '#modules/audit/events/audit_events'
import { redactAuditValue } from '#modules/audit/public_contracts/audit_event_redaction'
import {
  sanitizeErrorDetails,
  sanitizeErrorText,
} from '#modules/errors/public_contracts/error_sanitization'

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

export default class ProcessAuditLogEventCommand extends BaseCommand<[AuditLogEvent], void> {
  constructor(private readonly repository: Pick<AuditLogRepository, 'create'>) {
    super()
  }

  async execute(event: AuditLogEvent): Promise<void> {
    const normalizedEvent = normalizeEvent(event)
    await this.repository.create({
      user_id: normalizedEvent.userId,
      action: normalizedEvent.action,
      entity_type: normalizedEvent.entityType ?? '',
      entity_id:
        normalizedEvent.entityId !== null && normalizedEvent.entityId !== undefined
          ? String(normalizedEvent.entityId)
          : null,
      old_values: normalizedEvent.oldValues ?? null,
      new_values: normalizedEvent.newValues ?? null,
      ip_address: normalizedEvent.ipAddress ?? null,
      user_agent: normalizedEvent.userAgent ?? null,
      redaction_applied: normalizedEvent.redactionApplied ?? false,
    })
  }
}
