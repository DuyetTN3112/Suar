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
  targetType: string | null
  targetId: string | null
  targetScope: string | null
  retentionClass: string | null
  durationMs: number | null
  errorClass: string | null
  errorMessage: string | null
  summary: string
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
  return auditLog.resource_id ? `${action} ${resource} #${auditLog.resource_id}` : `${action} ${resource}`
}

function buildStructuredAuditSummary(
  structured: AdminAuditLogStructuredEventSummary,
  fallback: string
): string {
  const subject =
    structured.targetType || structured.module || structured.subsystem || structured.eventFamily
  const action = structured.eventName ? titleizeToken(structured.eventName) : fallback
  const workflow = structured.workflow ? ` · ${titleizeToken(structured.workflow)}` : ''
  const targetId = structured.targetId ? ` #${structured.targetId}` : ''

  return subject ? `${action} on ${titleizeToken(subject)}${targetId}${workflow}` : fallback
}

function parseStructuredAuditEvent(
  auditLog: {
    action: string
    resource_type: string
    resource_id: string | null
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
    details: {
      new_values?: Record<string, unknown>
    }
  }
): AdminAuditLogStructuredEventSummary {
  const fallbackSummary = buildFallbackAuditSummary(auditLog)
  const hasEnterpriseColumns = Boolean(
    auditLog.event_name ||
      auditLog.module ||
      auditLog.workflow ||
      auditLog.trace_id ||
      auditLog.request_id ||
      auditLog.target_type
  )

  if (hasEnterpriseColumns) {
    const structured: AdminAuditLogStructuredEventSummary = {
      isStructured: true,
      eventName: stringOrNull(auditLog.event_name),
      eventFamily: stringOrNull(auditLog.event_family),
      module: stringOrNull(auditLog.module),
      subsystem: stringOrNull(auditLog.subsystem),
      workflow: stringOrNull(auditLog.workflow),
      stage: stringOrNull(auditLog.stage),
      severity: stringOrNull(auditLog.severity),
      outcome: stringOrNull(auditLog.outcome),
      traceId: stringOrNull(auditLog.trace_id),
      correlationKey: stringOrNull(auditLog.correlation_key),
      frontendSubmissionId: null,
      requestId: stringOrNull(auditLog.request_id),
      initiatorType: stringOrNull(auditLog.actor_type),
      actorUserId: stringOrNull(auditLog.actor_user_id),
      actorOrganizationId: stringOrNull(auditLog.actor_org_id),
      targetType: stringOrNull(auditLog.target_type ?? auditLog.resource_type),
      targetId: stringOrNull(auditLog.target_id ?? auditLog.resource_id),
      targetScope: stringOrNull(auditLog.actor_role_surface),
      retentionClass: stringOrNull(auditLog.retention_class),
      durationMs: null,
      errorClass: null,
      errorMessage: null,
      summary: fallbackSummary,
    }

    return {
      ...structured,
      summary: buildStructuredAuditSummary(structured, fallbackSummary),
    }
  }

  const newValues = asValueMap(auditLog.details.new_values)

  if (!newValues || !('event_name' in newValues) || !('module' in newValues)) {
    return {
      isStructured: false,
      eventName: null,
      eventFamily: null,
      module: null,
      subsystem: null,
      workflow: null,
      stage: null,
      severity: null,
      outcome: null,
      traceId: null,
      correlationKey: null,
      frontendSubmissionId: null,
      requestId: null,
      initiatorType: null,
      actorUserId: null,
      actorOrganizationId: null,
      targetType: null,
      targetId: null,
      targetScope: null,
      retentionClass: null,
      durationMs: null,
      errorClass: null,
      errorMessage: null,
      summary: fallbackSummary,
    }
  }

  const actor = asValueMap(newValues['actor'])
  const trace = asValueMap(newValues['trace'])
  const request = asValueMap(newValues['request'])
  const target = asValueMap(newValues['target'])
  const runtime = asValueMap(newValues['runtime'])
  const error = asValueMap(newValues['error'])
  const compliance = asValueMap(newValues['compliance'])

  const structured: AdminAuditLogStructuredEventSummary = {
    isStructured: true,
    eventName: stringOrNull(newValues['event_name']),
    eventFamily: stringOrNull(newValues['event_family']),
    module: stringOrNull(newValues['module']),
    subsystem: stringOrNull(newValues['subsystem']),
    workflow: stringOrNull(newValues['workflow']),
    stage: stringOrNull(newValues['stage']),
    severity: stringOrNull(newValues['severity']),
    outcome: stringOrNull(newValues['outcome']),
    traceId: stringOrNull(trace?.['id']),
    correlationKey: stringOrNull(trace?.['correlation_key']),
    frontendSubmissionId: stringOrNull(trace?.['frontend_submission_id']),
    requestId: stringOrNull(request?.['id']),
    initiatorType: stringOrNull(actor?.['initiator_type']),
    actorUserId: stringOrNull(actor?.['user_id']),
    actorOrganizationId: stringOrNull(actor?.['organization_id']),
    targetType: stringOrNull(target?.['type']),
    targetId: stringOrNull(target?.['id']),
    targetScope: stringOrNull(target?.['scope']),
    retentionClass: stringOrNull(compliance?.['retention_class']),
    durationMs: numberOrNull(runtime?.['duration_ms']),
    errorClass: stringOrNull(error?.['class']),
    errorMessage: stringOrNull(error?.['message']),
    summary: fallbackSummary,
  }

  return {
    ...structured,
    summary: buildStructuredAuditSummary(structured, fallbackSummary),
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

export function mapAdminDashboardStatsResponse(
  stats: {
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
  }
) {
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

export function mapAdminUserResponse(
  user: {
    id: string
    username: string
    email: string | null
    system_role: string
    status: string
    current_organization_id: string | null
    is_external_contributor: boolean
    created_at: string
  }
) {
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

export function mapAdminOrganizationResponse(
  organization: {
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
  }
) {
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

export function mapAdminAuditLogResponse(
  auditLog: {
    id: string
    user: {
      id: string
      username: string
    } | null
    action: string
    resource_type: string
    resource_id: string | null
    details: {
      old_values?: Record<string, unknown>
      new_values?: Record<string, unknown>
    }
    ip_address: string
    user_agent: string
    created_at: string
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
  }
) {
  const structured = parseStructuredAuditEvent(auditLog)

  return {
    id: auditLog.id,
    user: auditLog.user,
    action: auditLog.action,
    resourceType: auditLog.resource_type,
    resourceId: auditLog.resource_id,
    details: {
      oldValues: auditLog.details.old_values ?? {},
      newValues: auditLog.details.new_values ?? {},
    },
    ipAddress: auditLog.ip_address,
    userAgent: auditLog.user_agent,
    createdAt: auditLog.created_at,
    investigation: structured,
  }
}
