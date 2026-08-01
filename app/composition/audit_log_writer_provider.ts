import { AuditLogWriterAdapter } from '#composition/adapters/audit_log_writer_adapter'
import { NodeAuditEventHashProvider } from '#modules/audit/infra/adapters/node_audit_event_hash_provider'
import PostgresAuditLogRepository from '#modules/audit/infra/repositories/postgres_audit_log_repository'
import { registerAuditEventHashProvider } from '#modules/audit/public_contracts/audit_event_hash'
import { registerAuditLogWriter } from '#modules/audit/public_contracts/audit_log_writer'

export default class AuditLogWriterProvider {
  register(): void {
    registerAuditEventHashProvider(new NodeAuditEventHashProvider())
    const auditLogWriter = new AuditLogWriterAdapter(new PostgresAuditLogRepository())
    registerAuditLogWriter(auditLogWriter)
  }
}
