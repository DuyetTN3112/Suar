
export interface AuditLogResponseItem {
  id: string
  action: string
  user: { id: string; name: string; email: string } | null
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
