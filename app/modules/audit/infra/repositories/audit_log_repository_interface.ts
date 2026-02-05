import type { DatabaseId } from '#types/database'

export interface AuditLogCreateData {
  user_id: DatabaseId | null
  action: string
  entity_type: string
  entity_id?: DatabaseId | null
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
}

export interface AuditLogRecord {
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

export interface AuditLogQuery {
  user_id?: DatabaseId
  entity_type?: string
  entity_id?: DatabaseId
  action?: string
  from?: Date
  to?: Date
  page?: number
  limit?: number
}

export interface AuditLogRepository {
  create(data: AuditLogCreateData): Promise<void>
  findMany(query: AuditLogQuery): Promise<{ data: AuditLogRecord[]; total: number }>
  count(query: AuditLogQuery): Promise<number>
  getLastActivityByUsers(
    entityType: string,
    entityId: DatabaseId,
    userIds: DatabaseId[]
  ): Promise<Map<string, Date | null>>
}
