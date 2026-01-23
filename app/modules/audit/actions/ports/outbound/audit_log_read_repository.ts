import type {
  AdminAuditLogListParams,
  AdminAuditLogRecord,
  AuditLogRecord,
} from '#modules/audit/public_contracts/audit_read_contract'

export interface AdminAuditLogPage {
  data: AdminAuditLogRecord[]
  total: number
  nextCursor: string | null
  previousCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export abstract class AuditLogReadRepository {
  abstract listByEntity(
    entityType: string,
    entityId: string,
    limit: number
  ): Promise<AuditLogRecord[]>
  abstract listAdmin(params: AdminAuditLogListParams): Promise<AdminAuditLogPage>
  abstract getLastActivityByUsers(
    entityType: string,
    entityId: string,
    userIds: string[]
  ): Promise<Map<string, Date | null>>
}
