import type {
  AdminAuditLogPage,
  AuditLogReadRepository,
} from '#modules/audit/actions/ports/outbound/audit_log_read_repository'
import type { AdminAuditLogListParams } from '#modules/audit/public_contracts/audit_read_contract'

export class ListAdminAuditLogsQuery {
  constructor(private readonly repository: AuditLogReadRepository) {}

  execute(params: AdminAuditLogListParams): Promise<AdminAuditLogPage> {
    return this.repository.listAdmin(params)
  }
}
