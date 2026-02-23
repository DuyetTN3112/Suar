import type { AuditLogReadRepository } from '#modules/audit/actions/ports/outbound/audit_log_read_repository'
import type { AuditLogRecord } from '#modules/audit/public_contracts/audit_read_contract'

export class ListAuditLogsByEntityQuery {
  constructor(private readonly repository: AuditLogReadRepository) {}

  execute(entityType: string, entityId: string, limit: number): Promise<AuditLogRecord[]> {
    return this.repository.listByEntity(entityType, entityId, limit)
  }
}
