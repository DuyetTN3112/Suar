export type AdminAuditSurface = 'system' | 'organization' | 'user'

export interface AdminAuditTargetReferenceSet {
  type: string
  ids: string[]
}

export interface AdminAuditEventRecord {
  id: string
  user_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  created_at: Date
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
  source_occurred_at?: Date | null
  redaction_applied?: boolean
  schema_version?: number
  event_hash?: string | null
  prev_hash?: string | null
}

export interface AdminAuditEventListInput {
  page: number
  perPage: number
  after?: string | null
  before?: string | null
  surface?: AdminAuditSurface
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
  searchMatchedActorUserIds?: string[]
  organizationScopedTargets?: AdminAuditTargetReferenceSet[]
  searchMatchedTargets?: AdminAuditTargetReferenceSet[]
}

export interface AdminAuditEventPage {
  data: AdminAuditEventRecord[]
  total: number
  nextCursor: string | null
  previousCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * Consumer-owned boundary for Audit-owned event storage.
 *
 * Admin supplies already-resolved actor and domain target projections. The
 * implementation must only read the Audit module's event persistence.
 */
export abstract class AdminAuditEventReader {
  abstract list(input: AdminAuditEventListInput): Promise<AdminAuditEventPage>
}
