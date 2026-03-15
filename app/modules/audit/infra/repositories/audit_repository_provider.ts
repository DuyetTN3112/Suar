
import type { AuditLogRepository } from './audit_log_repository_interface.js'
import PostgresAuditLogRepository from './postgres_audit_log_repository.js'

import loggerService from '#modules/logger/public_contracts/logger_service'

let auditLogRepo: AuditLogRepository | null = null

export function getAuditLogRepository(): AuditLogRepository {
  if (auditLogRepo) return auditLogRepo

  auditLogRepo = new PostgresAuditLogRepository()
  loggerService.info('AuditLog repository initialized: postgres')
  return auditLogRepo
}

export const auditRepositoryProvider = {
  getAuditLogRepository,
} as const
