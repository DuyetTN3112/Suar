import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { AuditLogEvent } from '#events/event_types'

/**
 * Audit Log Listener — ghi nhật ký hành động async.
 *
 * Thay thế MySQL stored procedure: log_audit()
 * Pattern: Event-driven, non-blocking, fire-and-forget
 *
 * Uses Repository Pattern (Sprint 5):
 *   - RepositoryFactory resolves implementation based on env var AUDIT_STORAGE
 *   - Supports mysql | mongodb | both (DualWrite)
 */
emitter.on('audit:log', async (event: AuditLogEvent) => {
  try {
    const { RepositoryFactory } = await import('#infra/shared/repositories/index')
    const repo = await RepositoryFactory.getAuditLogRepository()

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
