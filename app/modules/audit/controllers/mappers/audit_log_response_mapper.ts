import type { DatabaseId } from '#types/database'

export interface AuditLogResponseItem {
  id: DatabaseId
  action: string
  user: { id: DatabaseId; name: string; email: string } | null
  timestamp: Date
  changes: { field: string; oldValue: unknown; newValue: unknown }[]
}

export function mapTaskAuditLogResponse(
  auditLogs: AuditLogResponseItem[]
): { success: true; data: AuditLogResponseItem[] } {
  return {
    success: true,
    data: auditLogs,
  }
}
