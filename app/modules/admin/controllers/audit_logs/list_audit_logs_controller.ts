import type { HttpContext } from '@adonisjs/core/http'

import ListAuditLogsQuery from '#actions/admin/audit_logs/queries/list_audit_logs_query'
import { PAGINATION } from '#modules/common/constants/common_constants'
import { ExecutionContext } from '#types/execution_context'

const ADMIN_AUDIT_LOGS_PER_PAGE = 50

/**
 * ListAuditLogsController
 *
 * Show system audit logs (System Admin only)
 *
 * GET /admin/audit-logs
 */
export default class ListAuditLogsController {
  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx

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

    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new ListAuditLogsQuery(execCtx)

    const result = await query.handle({
      page,
      perPage: ADMIN_AUDIT_LOGS_PER_PAGE,
      search,
      action,
      resourceType,
      userId,
      from,
      to,
    })

    return inertia.render('admin/audit_logs/index', {
      auditLogs: result.data,
      pagination: result.meta,
      filters: {
        search: search ?? '',
        action: action ?? null,
        resource_type: resourceType ?? null,
        user_id: userId ?? null,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
      },
    })
  }
}
