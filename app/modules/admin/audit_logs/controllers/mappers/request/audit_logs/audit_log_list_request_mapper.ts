import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/audit_logs/actions/dtos/common/audit_logs/admin_pagination'
import type { ListAuditLogsDTO } from '#modules/admin/audit_logs/actions/queries/audit_logs/list_audit_logs_query'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'

export const ADMIN_AUDIT_LOGS_PER_PAGE = 50
const USER_AUDIT_SEARCH_MAX_LENGTH = 120
const SYSTEM_AUDIT_SEARCH_MAX_LENGTH = 160
const SYSTEM_AUDIT_TOKEN_MAX_LENGTH = 120
const USER_AUDIT_OUTCOMES = new Set(['recorded', 'success', 'warning', 'failure'])
const SYSTEM_AUDIT_OUTCOMES = new Set(['recorded', 'success', 'warning', 'failure', 'skipped'])
const SYSTEM_AUDIT_SEVERITIES = new Set(['trace', 'debug', 'info', 'warn', 'error'])
const SYSTEM_AUDIT_ACTOR_TYPES = new Set([
  'automation',
  'cli',
  'frontend',
  'integration',
  'job',
  'listener',
  'system',
  'unknown',
  'user',
])
const USER_AUDIT_RESOURCE_TYPES = new Set([
  'organization',
  'organization_invitation',
  'organization_member',
  'organization_membership',
  'organization_user',
  'project',
  'review',
  'task',
  'user',
])

export type AuditLogSurface = 'system' | 'organization' | 'user'

export interface AuditLogListInput {
  page: number
  after?: string
  before?: string
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
}

export interface AuditLogSurfaceScope {
  actorUserId?: string
  organizationId?: string
}

interface AuditLogRequestSource {
  request: {
    input(key: string, defaultValue?: unknown): unknown
  }
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function toOptionalDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function readAuditLogListInput(ctx: AuditLogRequestSource): AuditLogListInput {
  const { request } = ctx
  const after = toOptionalString(request.input('after', null))
  const before = toOptionalString(request.input('before', null))
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE),
      perPage: ADMIN_AUDIT_LOGS_PER_PAGE,
    },
    PAGINATION,
    { perPage: ADMIN_AUDIT_LOGS_PER_PAGE }
  )
  const page = after || before ? PAGINATION.DEFAULT_PAGE : pagination.page
  const search = toOptionalString(request.input('search', ''))
  const action = toOptionalString(request.input('action', null))
  const resourceType = toOptionalString(
    request.input('resourceType', request.input('resource_type', null))
  )
  const outcome = toOptionalString(request.input('outcome', null))
  const module = toOptionalString(request.input('module', null))
  const workflow = toOptionalString(request.input('workflow', null))
  const severity = toOptionalString(request.input('severity', null))
  const actorType = toOptionalString(request.input('actorType', request.input('actor_type', null)))
  const retentionClass = toOptionalString(
    request.input('retentionClass', request.input('retention_class', null))
  )
  const traceId = toOptionalString(request.input('traceId', request.input('trace_id', null)))
  const userId = toOptionalString(request.input('userId', request.input('user_id', null)))
  const from = toOptionalDate(request.input('from', null))
  const to = toOptionalDate(request.input('to', null))

  return {
    page,
    ...(after ? { after } : {}),
    ...(before ? { before } : {}),
    ...(search ? { search } : {}),
    ...(action ? { action } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(module ? { module } : {}),
    ...(workflow ? { workflow } : {}),
    ...(severity ? { severity } : {}),
    ...(outcome ? { outcome } : {}),
    ...(actorType ? { actorType } : {}),
    ...(retentionClass ? { retentionClass } : {}),
    ...(traceId ? { traceId } : {}),
    ...(userId ? { userId } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }
}

export function normalizeSystemAuditLogListInput(input: AuditLogListInput): AuditLogListInput {
  const validDateRange = !input.from || !input.to || input.from.getTime() <= input.to.getTime()
  const bounded = (value: string, maxLength = SYSTEM_AUDIT_TOKEN_MAX_LENGTH) =>
    value.slice(0, maxLength)

  return {
    page: input.page,
    ...(input.after ? { after: bounded(input.after, 1024) } : {}),
    ...(input.before ? { before: bounded(input.before, 1024) } : {}),
    ...(input.search ? { search: bounded(input.search, SYSTEM_AUDIT_SEARCH_MAX_LENGTH) } : {}),
    ...(input.action ? { action: bounded(input.action) } : {}),
    ...(input.resourceType ? { resourceType: bounded(input.resourceType) } : {}),
    ...(input.module ? { module: bounded(input.module) } : {}),
    ...(input.workflow ? { workflow: bounded(input.workflow) } : {}),
    ...(input.severity && SYSTEM_AUDIT_SEVERITIES.has(input.severity)
      ? { severity: input.severity }
      : {}),
    ...(input.outcome && SYSTEM_AUDIT_OUTCOMES.has(input.outcome)
      ? { outcome: input.outcome }
      : {}),
    ...(input.actorType && SYSTEM_AUDIT_ACTOR_TYPES.has(input.actorType)
      ? { actorType: input.actorType }
      : {}),
    ...(input.retentionClass ? { retentionClass: bounded(input.retentionClass) } : {}),
    ...(input.traceId ? { traceId: bounded(input.traceId, 160) } : {}),
    ...(input.userId ? { userId: bounded(input.userId, 160) } : {}),
    ...(validDateRange && input.from ? { from: input.from } : {}),
    ...(validDateRange && input.to ? { to: input.to } : {}),
  }
}

export function normalizeAuditLogSurfaceInput(
  input: AuditLogListInput,
  surface: AuditLogSurface
): AuditLogListInput {
  if (surface === 'system') return normalizeSystemAuditLogListInput(input)
  if (surface === 'organization') return input

  const validDateRange = !input.from || !input.to || input.from.getTime() <= input.to.getTime()
  return {
    page: input.page,
    ...(input.after ? { after: input.after } : {}),
    ...(input.before ? { before: input.before } : {}),
    ...(input.search ? { search: input.search.slice(0, USER_AUDIT_SEARCH_MAX_LENGTH) } : {}),
    ...(input.resourceType && USER_AUDIT_RESOURCE_TYPES.has(input.resourceType)
      ? { resourceType: input.resourceType }
      : {}),
    ...(input.outcome && USER_AUDIT_OUTCOMES.has(input.outcome) ? { outcome: input.outcome } : {}),
    ...(validDateRange && input.from ? { from: input.from } : {}),
    ...(validDateRange && input.to ? { to: input.to } : {}),
  }
}

export function toAuditLogListDTO(
  input: AuditLogListInput,
  surface: AuditLogSurface,
  scope: AuditLogSurfaceScope = {}
): ListAuditLogsDTO {
  return {
    page: input.page,
    perPage: ADMIN_AUDIT_LOGS_PER_PAGE,
    after: input.after ?? null,
    before: input.before ?? null,
    surface,
    ...(scope.actorUserId ? { actorUserId: scope.actorUserId } : {}),
    ...(scope.organizationId ? { organizationId: scope.organizationId } : {}),
    ...(input.search ? { search: input.search } : {}),
    ...(surface !== 'user' && input.action ? { action: input.action } : {}),
    ...(input.resourceType ? { resourceType: input.resourceType } : {}),
    ...(surface !== 'user' && input.module ? { module: input.module } : {}),
    ...(surface !== 'user' && input.workflow ? { workflow: input.workflow } : {}),
    ...(surface !== 'user' && input.severity ? { severity: input.severity } : {}),
    ...(input.outcome ? { outcome: input.outcome } : {}),
    ...(surface !== 'user' && input.actorType ? { actorType: input.actorType } : {}),
    ...(surface !== 'user' && input.retentionClass ? { retentionClass: input.retentionClass } : {}),
    ...(surface !== 'user' && input.traceId ? { traceId: input.traceId } : {}),
    ...(surface !== 'user' && input.userId ? { userId: input.userId } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.to ? { to: input.to } : {}),
  }
}
