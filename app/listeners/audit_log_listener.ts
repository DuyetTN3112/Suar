import emitter from '@adonisjs/core/services/emitter'

import type { AuditLogEvent } from '#events/event_types'
import loggerService from '#infra/logger/logger_service'

/**
 * Audit Log Listener — ghi nhật ký hành động async.
 *
 * Thay thế MySQL stored procedure: log_audit()
 * Pattern: Event-driven, non-blocking, fire-and-forget
 *
 * Uses the audit module repository provider.
 */
emitter.on('audit:log', async (event: AuditLogEvent) => {
  try {
    const { auditRepositoryProvider } = await import(
      '#infra/audit/repositories/audit_repository_provider'
    )
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
    })
  } catch (error) {
    // Audit log failure KHÔNG được crash app — chỉ log error
    loggerService.error('Audit log write failed', {
      userId: event.userId,
      action: event.action,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
