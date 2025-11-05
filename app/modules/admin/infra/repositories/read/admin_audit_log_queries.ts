import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export interface ListAuditLogsParams {
  page: number
  perPage: number
  search?: string
  action?: string
  resourceType?: string
  userId?: string
  from?: Date
  to?: Date
}

export interface AdminAuditLogRecord {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

export const AdminAuditLogReadOps = {
  async listAuditLogs(params: ListAuditLogsParams): Promise<{
    data: AdminAuditLogRecord[]
    total: number
  }> {
    const search = params.search?.trim()
    const searchMatchedUserIds = search ? await userPublicApi.findIdsBySearch(search) : []

    return auditPublicApi.listForAdmin({
      ...params,
      search,
      searchMatchedUserIds,
    })
  },
}
