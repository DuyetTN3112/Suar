export interface TaskAuditTrailEntry {
  id: string
  action: string
  user: { id: string; name: string; email: string } | null
  timestamp: Date
  changes: { field: string; oldValue: unknown; newValue: unknown }[]
}

export interface TaskAuditTrailReader {
  listTaskAuditTrail(taskId: string, limit: number): Promise<TaskAuditTrailEntry[]>
}
