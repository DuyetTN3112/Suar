export interface AuditLogRecord {
  id: string
  user_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  created_at: Date
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
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
  source_occurred_at?: Date | null
  redaction_applied?: boolean
  schema_version?: number
  event_hash?: string | null
  prev_hash?: string | null
}

export interface AdminAuditLogListParams {
  page: number
  perPage: number
  after?: string | null
  before?: string | null
  surface?: 'system' | 'organization' | 'user'
  actorUserId?: string
  organizationId?: string
  search?: string
  action?: string
  resourceType?: string
  module?: string
  workflow?: string
  severity?: string
  outcome?: string
  actorType?: string
  retentionClass?: string
  traceId?: string
  userId?: string
  from?: Date
  to?: Date
  searchMatchedUserIds?: string[]
  organizationScopedTargets?: Array<{ type: string; ids: string[] }>
  searchMatchedTargets?: Array<{ type: string; ids: string[] }>
}

export interface AdminAuditLogRecord extends AuditLogRecord {
  ip_address: string | null
  user_agent: string | null
}
