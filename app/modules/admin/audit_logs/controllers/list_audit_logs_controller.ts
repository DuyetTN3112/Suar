import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/audit_logs/actions/dtos/common/admin_pagination'
import { AdminAuditLogActionFactory } from '#modules/admin/audit_logs/actions/ports/inbound/admin_audit_log_action_factory'
import {
  mapAdminAuditLogResponse,
  wrapAdminCollectionResponse,
} from '#modules/admin/audit_logs/controllers/mappers/response/admin_api_response_mapper'
import {
  mapOrganizationAuditActivityResponse,
  mapUserAuditActivityResponse,
} from '#modules/admin/audit_logs/controllers/mappers/response/audit_log_surface_response_mapper'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import {
  normalizePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

const ADMIN_AUDIT_LOGS_PER_PAGE = 50
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
type AuditLogSurface = 'system' | 'organization' | 'user'

interface AuditLogListInput {
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

/**
 * ListAuditLogsController
 *
 * Show system audit logs (System Admin only)
 *
 * GET /admin/audit-logs
 */
@inject()
export default class ListAuditLogsController {
  constructor(private readonly actions: AdminAuditLogActionFactory) {}

  private buildListInput(ctx: HttpContext): AuditLogListInput {
    const { request } = ctx

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    const toOptionalDate = (value: unknown): Date | undefined => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return undefined
      }

      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? undefined : parsed
    }

    const after = toOptionalString(request.input('after', null) as unknown)
    const before = toOptionalString(request.input('before', null) as unknown)
    const pagination = normalizePagination(
      {
        page: request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: ADMIN_AUDIT_LOGS_PER_PAGE,
      },
      PAGINATION,
      { perPage: ADMIN_AUDIT_LOGS_PER_PAGE }
    )
    const page = after || before ? PAGINATION.DEFAULT_PAGE : pagination.page
    const search = toOptionalString(request.input('search', '') as unknown)
    const action = toOptionalString(request.input('action', null) as unknown)
    const resourceType = toOptionalString(
      request.input('resourceType', request.input('resource_type', null)) as unknown
    )
    const outcome = toOptionalString(request.input('outcome', null) as unknown)
    const module = toOptionalString(request.input('module', null) as unknown)
    const workflow = toOptionalString(request.input('workflow', null) as unknown)
    const severity = toOptionalString(request.input('severity', null) as unknown)
    const actorType = toOptionalString(
      request.input('actorType', request.input('actor_type', null)) as unknown
    )
    const retentionClass = toOptionalString(
      request.input('retentionClass', request.input('retention_class', null)) as unknown
    )
    const traceId = toOptionalString(
      request.input('traceId', request.input('trace_id', null)) as unknown
    )
    const userId = toOptionalString(
      request.input('userId', request.input('user_id', null)) as unknown
    )
    const from = toOptionalDate(request.input('from', null) as unknown)
    const to = toOptionalDate(request.input('to', null) as unknown)

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

  private normalizeSystemListInput(input: AuditLogListInput): AuditLogListInput {
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

  private async list(ctx: HttpContext) {
    const input = this.normalizeSystemListInput(this.buildListInput(ctx))
    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeListAuditLogsQuery(execCtx)

    const result = await query.handle({
      page: input.page,
      perPage: ADMIN_AUDIT_LOGS_PER_PAGE,
      after: input.after ?? null,
      before: input.before ?? null,
      ...(input.search ? { search: input.search } : {}),
      ...(input.action ? { action: input.action } : {}),
      ...(input.resourceType ? { resourceType: input.resourceType } : {}),
      ...(input.module ? { module: input.module } : {}),
      ...(input.workflow ? { workflow: input.workflow } : {}),
      ...(input.severity ? { severity: input.severity } : {}),
      ...(input.outcome ? { outcome: input.outcome } : {}),
      ...(input.actorType ? { actorType: input.actorType } : {}),
      ...(input.retentionClass ? { retentionClass: input.retentionClass } : {}),
      ...(input.traceId ? { traceId: input.traceId } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.from ? { from: input.from } : {}),
      ...(input.to ? { to: input.to } : {}),
    })

    return { result, filters: input }
  }

  private async listForSurface(
    ctx: HttpContext,
    surface: AuditLogSurface,
    scope: { actorUserId?: string; organizationId?: string } = {}
  ) {
    const input = this.buildListInput(ctx)
    const validUserDateRange =
      !input.from || !input.to || input.from.getTime() <= input.to.getTime()
    const surfaceInput: AuditLogListInput =
      surface === 'user'
        ? {
            page: input.page,
            ...(input.after ? { after: input.after } : {}),
            ...(input.before ? { before: input.before } : {}),
            ...(input.search
              ? { search: input.search.slice(0, USER_AUDIT_SEARCH_MAX_LENGTH) }
              : {}),
            ...(input.resourceType && USER_AUDIT_RESOURCE_TYPES.has(input.resourceType)
              ? { resourceType: input.resourceType }
              : {}),
            ...(input.outcome && USER_AUDIT_OUTCOMES.has(input.outcome)
              ? { outcome: input.outcome }
              : {}),
            ...(validUserDateRange && input.from ? { from: input.from } : {}),
            ...(validUserDateRange && input.to ? { to: input.to } : {}),
          }
        : surface === 'system'
          ? this.normalizeSystemListInput(input)
          : input
    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeListAuditLogsQuery(execCtx)

    const result = await query.handle({
      page: surfaceInput.page,
      perPage: ADMIN_AUDIT_LOGS_PER_PAGE,
      after: surfaceInput.after ?? null,
      before: surfaceInput.before ?? null,
      surface,
      ...(scope.actorUserId ? { actorUserId: scope.actorUserId } : {}),
      ...(scope.organizationId ? { organizationId: scope.organizationId } : {}),
      ...(surfaceInput.search ? { search: surfaceInput.search } : {}),
      ...(surface !== 'user' && 'action' in surfaceInput && surfaceInput.action
        ? { action: surfaceInput.action }
        : {}),
      ...(surfaceInput.resourceType ? { resourceType: surfaceInput.resourceType } : {}),
      ...(surface !== 'user' && surfaceInput.module ? { module: surfaceInput.module } : {}),
      ...(surface !== 'user' && surfaceInput.workflow ? { workflow: surfaceInput.workflow } : {}),
      ...(surface !== 'user' && surfaceInput.severity ? { severity: surfaceInput.severity } : {}),
      ...(surfaceInput.outcome ? { outcome: surfaceInput.outcome } : {}),
      ...(surface !== 'user' && surfaceInput.actorType
        ? { actorType: surfaceInput.actorType }
        : {}),
      ...(surface !== 'user' && surfaceInput.retentionClass
        ? { retentionClass: surfaceInput.retentionClass }
        : {}),
      ...(surface !== 'user' && surfaceInput.traceId ? { traceId: surfaceInput.traceId } : {}),
      ...(surface !== 'user' && 'userId' in surfaceInput && surfaceInput.userId
        ? { userId: surfaceInput.userId }
        : {}),
      ...(surfaceInput.from ? { from: surfaceInput.from } : {}),
      ...(surfaceInput.to ? { to: surfaceInput.to } : {}),
    })

    return { result, filters: surfaceInput }
  }

  private async renderSurface(
    ctx: HttpContext,
    surface: AuditLogSurface,
    title: string,
    scope: { actorUserId?: string; organizationId?: string } = {}
  ) {
    const { inertia } = ctx
    const { result, filters } = await this.listForSurface(ctx, surface, scope)
    const pageName =
      surface === 'organization'
        ? 'org/audit_logs/index'
        : surface === 'user'
          ? 'settings/audit_logs'
          : 'admin/audit_logs/index'
    const auditLogs =
      surface === 'user'
        ? result.data.map((log) => mapUserAuditActivityResponse(log, scope.actorUserId ?? ''))
        : surface === 'organization'
          ? result.data.map(mapOrganizationAuditActivityResponse)
          : result.data.map(mapAdminAuditLogResponse)

    return inertia.render(pageName, {
      auditLogs,
      pagination: toCanonicalPagePagination(result.meta),
      title,
      ...(surface === 'user'
        ? {
            filters: {
              search: filters.search ?? '',
              resourceType: filters.resourceType ?? null,
              outcome: filters.outcome ?? null,
              from: filters.from?.toISOString() ?? null,
              to: filters.to?.toISOString() ?? null,
              after: filters.after ?? null,
              before: filters.before ?? null,
            },
          }
        : {
            filters: {
              search: filters.search ?? '',
              action: filters.action ?? null,
              resourceType: filters.resourceType ?? null,
              module: filters.module ?? null,
              workflow: filters.workflow ?? null,
              severity: filters.severity ?? null,
              outcome: filters.outcome ?? null,
              actorType: filters.actorType ?? null,
              retentionClass: filters.retentionClass ?? null,
              traceId: filters.traceId ?? null,
              userId: filters.userId ?? null,
              from: filters.from?.toISOString() ?? null,
              to: filters.to?.toISOString() ?? null,
              after: filters.after ?? null,
              before: filters.before ?? null,
            },
            surface,
          }),
    })
  }

  async handle(ctx: HttpContext) {
    return this.renderSurface(ctx, 'system', 'Audit log hệ thống')
  }

  async orgHandle(ctx: HttpContext) {
    return this.renderSurface(ctx, 'organization', 'Audit log tổ chức', {
      organizationId: requireCurrentOrganizationId(ctx),
    })
  }

  async userHandle(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    return this.renderSurface(ctx, 'user', 'Audit log của tôi', {
      actorUserId: user.id,
    })
  }

  async apiIndex(ctx: HttpContext) {
    const { result, filters } = await this.list(ctx)

    ctx.response.status(HttpStatus.OK).json(
      wrapAdminCollectionResponse(result.data.map(mapAdminAuditLogResponse), result.meta, {
        filters: {
          search: filters.search ?? '',
          action: filters.action ?? null,
          resourceType: filters.resourceType ?? null,
          module: filters.module ?? null,
          workflow: filters.workflow ?? null,
          severity: filters.severity ?? null,
          outcome: filters.outcome ?? null,
          actorType: filters.actorType ?? null,
          retentionClass: filters.retentionClass ?? null,
          traceId: filters.traceId ?? null,
          userId: filters.userId ?? null,
          from: filters.from?.toISOString() ?? null,
          to: filters.to?.toISOString() ?? null,
          after: filters.after ?? null,
          before: filters.before ?? null,
        },
      })
    )
  }
}
