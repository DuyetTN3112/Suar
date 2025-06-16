import type { HttpContext } from '@adonisjs/core/http'
import ListAuditLogsQuery from '#actions/admin/audit_logs/queries/list_audit_logs_query'
import { ExecutionContext } from '#types/execution_context'

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
    const page = request.input('page', 1)
    const search = request.input('search', '')
    const action = request.input('action', null)
    const resourceType = request.input('resource_type', null)

    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new ListAuditLogsQuery(execCtx)

    const result = await query.handle({
      page,
      perPage: 50,
      search,
      action,
      resourceType,
    })

    return inertia.render('admin/audit_logs/index', {
      auditLogs: result.data,
      pagination: result.meta,
      filters: { search, action, resource_type: resourceType },
    })
  }
}
