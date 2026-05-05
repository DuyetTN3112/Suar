import {
  verifyAuditEventHash,
  type AuditEventIntegrityStatus,
} from '#modules/audit/public_contracts/audit_event_hash'
import { redactAuditValue } from '#modules/audit/public_contracts/audit_event_redaction'
import { toCanonicalApiPagination } from '#modules/pagination/public_contracts/pagination_public_api'

interface AdminPaginationLike {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  mode?: 'offset' | 'cursor'
  cursor?: {
    nextCursor: string | null
    previousCursor: string | null
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

interface AuditLogValueMap {
  [key: string]: unknown
}

interface AdminAuditLogStructuredEventSummary {
  isStructured: boolean
  eventName: string | null
  eventFamily: string | null
  module: string | null
  subsystem: string | null
  workflow: string | null
  stage: string | null
  severity: string | null
  outcome: string | null
  traceId: string | null
  correlationKey: string | null
  frontendSubmissionId: string | null
  requestId: string | null
  initiatorType: string | null
  actorUserId: string | null
  actorOrganizationId: string | null
  actorRoleSurface: string | null
  targetType: string | null
  targetId: string | null
  targetLabel: string | null
  targetOrganizationId: string | null
  targetScope: string | null
  retentionClass: string | null
  durationMs: number | null
  errorClass: string | null
  errorMessage: string | null
  integrity: {
    status: AuditEventIntegrityStatus
    eventHash: string | null
    previousHash: string | null
    schemaVersion: number
    redactionApplied: boolean
    defensiveRedactionApplied: boolean
  }
  summary: string
}

interface AdminAuditLogMapperInput {
  id: string
  source_user_id?: string | null
  user: {
    id: string
    username: string
  } | null
  action: string
  resource_type: string
  resource_id: string | null
  details: {
    old_values?: Record<string, unknown> | null
    new_values?: Record<string, unknown> | null
  }
  ip_address: string
  user_agent: string
  created_at: string
  source_occurred_at?: string | null
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
  target_label?: string | null
  target_org_id?: string | null
  request_id?: string | null
  trace_id?: string | null
  correlation_key?: string | null
  retention_class?: string | null
  redaction_applied?: boolean
  schema_version?: number
  event_hash?: string | null
  prev_hash?: string | null
}

function asValueMap(value: unknown): AuditLogValueMap | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as AuditLogValueMap)
    : null
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = stringOrNull(value)
    if (normalized) return normalized
  }
  return null
}

function didDefensiveRedactionChangeValue(
  originalValue: unknown,
  redactedValue: unknown,
  redactionApplied: boolean
): boolean {
  return (
    redactionApplied &&
    JSON.stringify(originalValue ?? null) !== JSON.stringify(redactedValue ?? null)
  )
}

function titleizeToken(token: string): string {
  return token
    .split(/[_\-.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildFallbackAuditSummary(auditLog: {
  action: string
  resource_type: string
  resource_id: string | null
}): string {
  const action = titleizeToken(auditLog.action)
  const resource = titleizeToken(auditLog.resource_type)
  return auditLog.resource_id
    ? `${action} ${resource} #${auditLog.resource_id}`
    : `${action} ${resource}`
}

function buildStructuredAuditSummary(
  structured: AdminAuditLogStructuredEventSummary,
  fallback: string
): string {
  const subject =
    structured.targetType || structured.module || structured.subsystem || structured.eventFamily
  const action = structured.eventName ? titleizeToken(structured.eventName) : fallback
  const workflow = structured.workflow ? ` · ${titleizeToken(structured.workflow)}` : ''
  const target = structured.targetLabel ?? (structured.targetId ? `#${structured.targetId}` : null)

  return subject
    ? `${action} on ${titleizeToken(subject)}${target ? ` ${target}` : ''}${workflow}`
    : fallback
}

function buildAuditIntegrityPayload(auditLog: AdminAuditLogMapperInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: auditLog.id,
    user_id: auditLog.source_user_id ?? auditLog.actor_user_id ?? auditLog.user?.id ?? null,
    action: auditLog.action,
    entity_type: auditLog.resource_type,
    entity_id: auditLog.resource_id,
    old_values: auditLog.details.old_values ?? null,
    new_values: auditLog.details.new_values ?? null,
    ip_address: auditLog.ip_address || null,
    user_agent: auditLog.user_agent || null,
    event_name: auditLog.event_name ?? auditLog.action,
    event_family: auditLog.event_family ?? null,
    module: auditLog.module ?? null,
    subsystem: auditLog.subsystem ?? null,
    workflow: auditLog.workflow ?? null,
    stage: auditLog.stage ?? null,
    severity: auditLog.severity ?? null,
    outcome: auditLog.outcome ?? null,
    actor_type: auditLog.actor_type ?? null,
    actor_user_id: auditLog.actor_user_id ?? auditLog.source_user_id ?? auditLog.user?.id ?? null,
    actor_org_id: auditLog.actor_org_id ?? null,
    actor_role_surface: auditLog.actor_role_surface ?? null,
    target_type: auditLog.target_type ?? auditLog.resource_type,
    target_id: auditLog.target_id ?? auditLog.resource_id,
    target_org_id: auditLog.target_org_id ?? null,
    request_id: auditLog.request_id ?? null,
    trace_id: auditLog.trace_id ?? null,
    correlation_key: auditLog.correlation_key ?? null,
    retention_class: auditLog.retention_class ?? null,
    redaction_applied: auditLog.redaction_applied ?? false,
    schema_version: auditLog.schema_version ?? 1,
    prev_hash: auditLog.prev_hash ?? null,
  }

  if ((auditLog.schema_version ?? 1) >= 3) {
    payload['source_occurred_at'] = auditLog.source_occurred_at ?? null
  }

  return payload
}

function parseStructuredAuditEvent(
  auditLog: AdminAuditLogMapperInput,
  defensiveRedactionApplied: boolean,
  integrityAuditLog: AdminAuditLogMapperInput = auditLog
): AdminAuditLogStructuredEventSummary {
  const fallbackSummary = buildFallbackAuditSummary(auditLog)
  const newValues = asValueMap(auditLog.details.new_values)
  const actor = asValueMap(newValues?.['actor'])
  const trace = asValueMap(newValues?.['trace'])
  const request = asValueMap(newValues?.['request'])
  const target = asValueMap(newValues?.['target'])
  const runtime = asValueMap(newValues?.['runtime'])
  const error = asValueMap(newValues?.['error'])
  const compliance = asValueMap(newValues?.['compliance'])
  const hasEnterpriseColumns = Boolean(
    auditLog.event_name ||
    auditLog.module ||
    auditLog.workflow ||
    auditLog.trace_id ||
    auditLog.request_id ||
    auditLog.target_type
  )
  const hasStructuredPayload = Boolean(
    newValues && ('event_name' in newValues || 'module' in newValues)
  )
  const integrityStatus = verifyAuditEventHash({
    event: buildAuditIntegrityPayload(integrityAuditLog),
    eventHash: integrityAuditLog.event_hash,
    prevHash: integrityAuditLog.prev_hash ?? null,
  })

  const structured: AdminAuditLogStructuredEventSummary = {
    isStructured: hasEnterpriseColumns || hasStructuredPayload,
    eventName: firstString(auditLog.event_name, newValues?.['event_name']),
    eventFamily: firstString(auditLog.event_family, newValues?.['event_family']),
    module: firstString(auditLog.module, newValues?.['module']),
    subsystem: firstString(auditLog.subsystem, newValues?.['subsystem']),
    workflow: firstString(auditLog.workflow, newValues?.['workflow']),
    stage: firstString(auditLog.stage, newValues?.['stage']),
    severity: firstString(auditLog.severity, newValues?.['severity']),
    outcome: firstString(auditLog.outcome, newValues?.['outcome']),
    traceId: firstString(auditLog.trace_id, trace?.['id']),
    correlationKey: firstString(auditLog.correlation_key, trace?.['correlation_key']),
    frontendSubmissionId: stringOrNull(trace?.['frontend_submission_id']),
    requestId: firstString(auditLog.request_id, request?.['id']),
    initiatorType: firstString(auditLog.actor_type, actor?.['initiator_type']),
    actorUserId: firstString(auditLog.actor_user_id, actor?.['user_id']),
    actorOrganizationId: firstString(auditLog.actor_org_id, actor?.['organization_id']),
    actorRoleSurface: firstString(auditLog.actor_role_surface, actor?.['role_surface']),
    targetType: firstString(auditLog.target_type, target?.['type'], auditLog.resource_type),
    targetId: firstString(auditLog.target_id, target?.['id'], auditLog.resource_id),
    targetLabel: firstString(auditLog.target_label),
    targetOrganizationId: firstString(
      auditLog.target_org_id,
      target?.['organization_id'],
      target?.['parent_id']
    ),
    targetScope: stringOrNull(target?.['scope']),
    retentionClass: firstString(auditLog.retention_class, compliance?.['retention_class']),
    durationMs: numberOrNull(runtime?.['duration_ms']),
    errorClass: stringOrNull(error?.['class']),
    errorMessage: stringOrNull(error?.['message']),
    integrity: {
      status: integrityStatus,
      eventHash: integrityAuditLog.event_hash ?? null,
      previousHash: integrityAuditLog.prev_hash ?? null,
      schemaVersion: integrityAuditLog.schema_version ?? 1,
      redactionApplied:
        auditLog.redaction_applied === true || compliance?.['redaction_applied'] === true,
      defensiveRedactionApplied,
    },
    summary: fallbackSummary,
  }

  return {
    ...structured,
    summary: structured.isStructured
      ? buildStructuredAuditSummary(structured, fallbackSummary)
      : fallbackSummary,
  }
}

export function mapAdminPagination(meta: AdminPaginationLike) {
  return toCanonicalApiPagination(meta)
}

export function wrapAdminCollectionResponse<TData, TExtra extends Record<string, unknown>>(
  data: TData,
  meta: AdminPaginationLike,
  extra: TExtra
) {
  return {
    data,
    pagination: mapAdminPagination(meta),
    ...extra,
  }
}

export function mapAdminDashboardStatsResponse(stats: {
  users: { total: number; active: number; suspended: number; new_this_month: number }
  organizations: { total: number; new_this_month: number }
  projects: { total: number; active: number; completed: number }
  tasks: { total: number; in_progress: number; completed: number }
  subscriptions: {
    total: number
    active: number
    expiring_soon: number
    pro: number
    promax: number
  }
  moderation: { pending_flagged_reviews: number }
}) {
  return {
    users: {
      total: stats.users.total,
      active: stats.users.active,
      suspended: stats.users.suspended,
      newThisMonth: stats.users.new_this_month,
    },
    organizations: {
      total: stats.organizations.total,
      newThisMonth: stats.organizations.new_this_month,
    },
    projects: stats.projects,
    tasks: {
      total: stats.tasks.total,
      inProgress: stats.tasks.in_progress,
      completed: stats.tasks.completed,
    },
    subscriptions: {
      total: stats.subscriptions.total,
      active: stats.subscriptions.active,
      expiringSoon: stats.subscriptions.expiring_soon,
      pro: stats.subscriptions.pro,
      promax: stats.subscriptions.promax,
    },
    moderation: {
      pendingFlaggedReviews: stats.moderation.pending_flagged_reviews,
    },
  }
}

export function mapAdminUserResponse(user: {
  id: string
  username: string
  email: string | null
  system_role: string
  status: string
  current_organization_id: string | null
  is_external_contributor: boolean
  created_at: string
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    systemRole: user.system_role,
    status: user.status,
    currentOrganizationId: user.current_organization_id,
    isExternalContributor: user.is_external_contributor,
    createdAt: user.created_at,
  }
}

export function mapAdminOrganizationResponse(organization: {
  id: string
  name: string
  slug: string
  description: string | null
  owner_id: string
  owner: {
    id: string
    username: string
    email: string
  }
  partner_type: string | null
  partner_is_active: boolean
  created_at: string
  updated_at: string
  _count: {
    members: number
    projects: number
  }
}) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    ownerId: organization.owner_id,
    owner: organization.owner,
    partnerType: organization.partner_type,
    partnerIsActive: organization.partner_is_active,
    createdAt: organization.created_at,
    updatedAt: organization.updated_at,
    counts: organization._count,
  }
}

export function mapAdminAuditLogResponse(auditLog: AdminAuditLogMapperInput) {
  const originalOldValues = auditLog.details.old_values ?? null
  const originalNewValues = auditLog.details.new_values ?? null
  const safeOldValues = redactAuditValue(originalOldValues)
  const safeNewValues = redactAuditValue(originalNewValues)
  const defensiveRedactionApplied =
    didDefensiveRedactionChangeValue(
      originalOldValues,
      safeOldValues.value,
      safeOldValues.redactionApplied
    ) ||
    didDefensiveRedactionChangeValue(
      originalNewValues,
      safeNewValues.value,
      safeNewValues.redactionApplied
    )
  const safeAuditLog: AdminAuditLogMapperInput = {
    ...auditLog,
    details: {
      old_values: asValueMap(safeOldValues.value),
      new_values: asValueMap(safeNewValues.value),
    },
  }
  const structured = parseStructuredAuditEvent(safeAuditLog, defensiveRedactionApplied, auditLog)

  return {
    id: auditLog.id,
    user: auditLog.user,
    action: auditLog.action,
    resourceType: auditLog.resource_type,
    resourceId: auditLog.resource_id,
    details: {
      oldValues: asValueMap(safeOldValues.value) ?? {},
      newValues: asValueMap(safeNewValues.value) ?? {},
    },
    ipAddress: auditLog.ip_address,
    userAgent: auditLog.user_agent,
    createdAt: auditLog.created_at,
    sourceOccurredAt: auditLog.source_occurred_at ?? null,
    investigation: structured,
  }
}
