import type { HttpContext } from '@adonisjs/core/http'

import ListAuditLogsQuery from '#modules/admin/actions/audit_logs/queries/list_audit_logs_query'
import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import {
  mapAdminAuditLogResponse,
  wrapAdminCollectionResponse,
} from '#modules/admin/controllers/mappers/response/admin_api_response_mapper'
import {
  mapOrganizationAuditActivityResponse,
  mapUserAuditActivityResponse,
} from '#modules/admin/controllers/mappers/response/audit_log_surface_response_mapper'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { normalizePagination, toCanonicalPagePagination  } from '#modules/pagination/public_contracts/pagination_public_api'

const ADMIN_AUDIT_LOGS_PER_PAGE = 50
type AuditLogSurface = 'system' | 'organization' | 'user'

/**
 * ListAuditLogsController
 *
 * Show system audit logs (System Admin only)
 *
 * GET /admin/audit-logs
 */
export default class ListAuditLogsController {
  private buildListInput(ctx: HttpContext) {
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
    const userId = toOptionalString(request.input('userId', request.input('user_id', null)) as unknown)
    const from = toOptionalDate(request.input('from', null) as unknown)
    const to = toOptionalDate(request.input('to', null) as unknown)

    return {
      page,
      ...(after ? { after } : {}),
      ...(before ? { before } : {}),
      ...(search ? { search } : {}),
      ...(action ? { action } : {}),
      ...(resourceType ? { resourceType } : {}),
      ...(userId ? { userId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }
  }

  private async list(ctx: HttpContext) {
    const input = this.buildListInput(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const query = new ListAuditLogsQuery(execCtx)

    const result = await query.handle({
      page: input.page,
      perPage: ADMIN_AUDIT_LOGS_PER_PAGE,
      after: input.after ?? null,
      before: input.before ?? null,
      ...(input.search ? { search: input.search } : {}),
      ...(input.action ? { action: input.action } : {}),
      ...(input.resourceType ? { resourceType: input.resourceType } : {}),
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
    const execCtx = actionContextFromHttp(ctx)
    const query = new ListAuditLogsQuery(execCtx)

    const result = await query.handle({
      page: input.page,
      perPage: ADMIN_AUDIT_LOGS_PER_PAGE,
      after: input.after ?? null,
      before: input.before ?? null,
      surface,
      ...(scope.actorUserId ? { actorUserId: scope.actorUserId } : {}),
      ...(scope.organizationId ? { organizationId: scope.organizationId } : {}),
      ...(input.from ? { from: input.from } : {}),
      ...(input.to ? { to: input.to } : {}),
    })

    return { result, filters: input }
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
        ? result.data.map(mapUserAuditActivityResponse)
        : surface === 'organization'
          ? result.data.map(mapOrganizationAuditActivityResponse)
          : result.data.map(mapAdminAuditLogResponse)

    return inertia.render(pageName, {
      auditLogs,
      pagination: toCanonicalPagePagination(result.meta),
      title,
      ...(surface === 'system'
        ? {
            filters: {
              search: filters.search ?? '',
              action: filters.action ?? null,
              resourceType: filters.resourceType ?? null,
              userId: filters.userId ?? null,
              from: filters.from?.toISOString() ?? null,
              to: filters.to?.toISOString() ?? null,
              after: filters.after ?? null,
              before: filters.before ?? null,
            },
            surface,
          }
        : {}),
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
      wrapAdminCollectionResponse(
        result.data.map(mapAdminAuditLogResponse),
        result.meta,
        {
          filters: {
            search: filters.search ?? '',
            action: filters.action ?? null,
            resourceType: filters.resourceType ?? null,
            userId: filters.userId ?? null,
            from: filters.from?.toISOString() ?? null,
            to: filters.to?.toISOString() ?? null,
            after: filters.after ?? null,
            before: filters.before ?? null,
          },
        }
      )
    )
  }
}
