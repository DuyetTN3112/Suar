import { listAdminAuditLogs } from '#composition/admin/audit/audit_read_composition'
import type {
  AdminAuditEventListInput,
  AdminAuditEventPage,
  AdminAuditEventReader,
} from '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_event_reader'
import type { AdminAuditLogListParams } from '#modules/audit/public_contracts/audit_read_contract'

/**
 * Outer adapter from Admin's consumer-owned port to Audit's read capability.
 */
export class AdminAuditEventReaderAdapter implements AdminAuditEventReader {
  async list(input: AdminAuditEventListInput): Promise<AdminAuditEventPage> {
    const { searchMatchedActorUserIds, ...auditInput } = input
    const params: AdminAuditLogListParams = {
      ...auditInput,
      searchMatchedUserIds: searchMatchedActorUserIds ?? [],
    }

    return listAdminAuditLogs(params)
  }
}
