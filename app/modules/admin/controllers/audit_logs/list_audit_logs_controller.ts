import type { HttpContext } from '@adonisjs/core/http'

import ListAuditLogsQuery from '#modules/admin/actions/audit_logs/queries/list_audit_logs_query'
import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'

const ADMIN_AUDIT_LOGS_PER_PAGE = 50

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

    const toPageNumber = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(1, Math.trunc(value))
      }
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1
      }
      return 1
    }

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

    const page = toPageNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown)
    const search = toOptionalString(request.input('search', '') as unknown)
    const action = toOptionalString(request.input('action', null) as unknown)
    const resourceType = toOptionalString(request.input('resource_type', null) as unknown)
    const userId = toOptionalString(request.input('user_id', null) as unknown)
    const from = toOptionalDate(request.input('from', null) as unknown)
    const to = toOptionalDate(request.input('to', null) as unknown)

    return { page, search, action, resourceType, userId, from, to }
  }

  private async list(ctx: HttpContext) {
    const input = this.buildListInput(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const query = new ListAuditLogsQuery(execCtx)

    const result = await query.handle({
      page: input.page,
      perPage: ADMIN_AUDIT_LOGS_PER_PAGE,
      search: input.search,
      action: input.action,
      resourceType: input.resourceType,
      userId: input.userId,
      from: input.from,
      to: input.to,
    })

    return { result, filters: input }
  }

  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const { result, filters } = await this.list(ctx)

    return inertia.render('admin/audit_logs/index', {
      auditLogs: result.data,
      pagination: result.meta,
      filters: {
        search: filters.search ?? '',
        action: filters.action ?? null,
        resource_type: filters.resourceType ?? null,
        user_id: filters.userId ?? null,
        from: filters.from?.toISOString() ?? null,
        to: filters.to?.toISOString() ?? null,
      },
    })
  }

  async apiIndex(ctx: HttpContext) {
    const { result, filters } = await this.list(ctx)

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      meta: result.meta,
      filters: {
        search: filters.search ?? '',
        action: filters.action ?? null,
        resource_type: filters.resourceType ?? null,
        user_id: filters.userId ?? null,
        from: filters.from?.toISOString() ?? null,
        to: filters.to?.toISOString() ?? null,
      },
    });
  }
}
