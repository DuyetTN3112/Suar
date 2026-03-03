import PostgresAuditLogRepository from './postgres_audit_log_repository.js'

import type { AuditLogRepository } from '#modules/audit/actions/ports/outbound/audit_log_repository'
import loggerService from '#modules/logger/public_contracts/application_logger'

let auditLogRepo: AuditLogRepository | null = null

export function getAuditLogRepository(): AuditLogRepository {
  if (auditLogRepo) return auditLogRepo

  auditLogRepo = new PostgresAuditLogRepository()
  loggerService.debug('AuditLog repository initialized: postgres')
  return auditLogRepo
}

export const auditRepositoryProvider = {
  getAuditLogRepository,
} as const
