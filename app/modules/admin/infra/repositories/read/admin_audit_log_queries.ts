import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type {
  AdminAuditLogListParams as AuditAdminAuditLogListParams,
  AdminAuditLogRecord as AuditAdminAuditLogRecord,
} from '#modules/audit/actions/read_audit_logs'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export type ListAuditLogsParams = AuditAdminAuditLogListParams
export type AdminAuditLogRecord = AuditAdminAuditLogRecord

export const AdminAuditLogReadOps = {
  async listAuditLogs(params: ListAuditLogsParams): Promise<{
    data: AdminAuditLogRecord[]
    total: number
    nextCursor: string | null
    previousCursor: string | null
    hasNextPage: boolean
    hasPreviousPage: boolean
  }> {
    const search = params.search?.trim()
    const searchMatchedUserIds = search ? await userPublicApi.findIdsBySearch(search) : []

    return auditPublicApi.listForAdmin({
      ...params,
      ...(search ? { search } : {}),
      searchMatchedUserIds,
    })
  },
}
