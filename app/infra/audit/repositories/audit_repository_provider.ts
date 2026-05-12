
import type { AuditLogRepository } from './audit_log_repository_interface.js'
import MongoAuditLogRepository from './mongo_audit_log_repository.js'

import loggerService from '#infra/logger/logger_service'

let auditLogRepo: AuditLogRepository | null = null

export function getAuditLogRepository(): AuditLogRepository {
  if (auditLogRepo) return auditLogRepo

  auditLogRepo = new MongoAuditLogRepository()
  loggerService.info('AuditLog repository initialized: mongodb')
  return auditLogRepo
}

export const auditRepositoryProvider = {
  getAuditLogRepository,
} as const
