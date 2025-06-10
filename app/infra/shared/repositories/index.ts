/**
 * Repository Layer — Sprint 5: Multi-DB Architecture
 *
 * Public API:
 *   - Interfaces: AuditLogRepository, NotificationRepository, UserActivityLogRepository
 *   - Factory: RepositoryFactory (resolves implementation based on env vars)
 *
 * Usage:
 * ```ts
 * import RepositoryFactory from '#infra/shared/repositories/repository_factory'
 * import type { AuditLogRepository } from '#infra/shared/repositories/interfaces'
 *
 * const auditRepo = await RepositoryFactory.getAuditLogRepository()
 * await auditRepo.create({ ... })
 * ```
 *
 * Configuration (env vars):
 *   AUDIT_STORAGE=mysql|mongodb|both     (default: mysql)
 *   NOTIFICATION_STORAGE=mysql|mongodb|both (default: mysql)
 *   ACTIVITY_LOG_STORAGE=mysql|mongodb|both (default: mysql)
 */

export type {
  AuditLogRepository,
  AuditLogCreateData,
  AuditLogRecord,
  AuditLogQuery,
  NotificationRepository,
  NotificationCreateData,
  NotificationRecord,
  UserActivityLogRepository,
  UserActivityLogCreateData,
  UserActivityLogRecord,
} from '#infra/shared/repositories/interfaces'

export { default as RepositoryFactory } from '#infra/shared/repositories/repository_factory'
