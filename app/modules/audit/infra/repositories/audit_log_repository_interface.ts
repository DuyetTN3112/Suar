
export interface AuditEventScopeData {
  surface: 'system' | 'user' | 'organization'
  user_id: string | null
  organization_id: string | null
}

export interface AuditLogCreateData {
  user_id: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
  event_name?: string | null
  event_family?: string | null
  module?: string | null
  subsystem?: string | null
  workflow?: string | null
  stage?: string | null
  severity?: string | null
  outcome?: string | null
  actor_type?: string | null
  actor_user_id?: string | null
  actor_org_id?: string | null
  actor_role_surface?: string | null
  target_type?: string | null
  target_id?: string | null
  target_org_id?: string | null
  request_id?: string | null
  trace_id?: string | null
  correlation_key?: string | null
  retention_class?: string | null
  redaction_applied?: boolean
  schema_version?: number
  event_hash?: string | null
  prev_hash?: string | null
  scopes?: AuditEventScopeData[]
  critical?: boolean
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
  event_name?: string | null
  event_family?: string | null
  module?: string | null
  subsystem?: string | null
  workflow?: string | null
  stage?: string | null
  severity?: string | null
  outcome?: string | null
  actor_type?: string | null
  actor_user_id?: string | null
  actor_org_id?: string | null
  actor_role_surface?: string | null
  target_type?: string | null
  target_id?: string | null
  target_org_id?: string | null
  request_id?: string | null
  trace_id?: string | null
  correlation_key?: string | null
  retention_class?: string | null
  redaction_applied?: boolean
  schema_version?: number
  event_hash?: string | null
  prev_hash?: string | null
  created_at: Date
}

export interface AuditLogQuery {
  user_id?: string
  entity_type?: string
  entity_id?: string
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
    entityId: string,
    userIds: string[]
  ): Promise<Map<string, Date | null>>
}
