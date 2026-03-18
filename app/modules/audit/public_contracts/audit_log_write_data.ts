export interface AuditLogData {
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_values?: unknown
  new_values?: unknown
  affected_user_ids?: string[]
}
