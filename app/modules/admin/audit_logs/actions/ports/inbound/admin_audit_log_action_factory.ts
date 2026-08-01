import type { AdminActionContext } from '#modules/admin/audit_logs/actions/action_context'
import type ListAuditLogsQuery from '#modules/admin/audit_logs/actions/query/list_audit_logs_query'

export abstract class AdminAuditLogActionFactory {
  abstract makeListAuditLogsQuery(execCtx: AdminActionContext): ListAuditLogsQuery
}
