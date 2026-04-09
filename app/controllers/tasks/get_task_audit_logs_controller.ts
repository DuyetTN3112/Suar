import type { HttpContext } from '@adonisjs/core/http'
import GetTaskAuditLogsQuery from '#actions/tasks/queries/get_task_audit_logs_query'
import { buildGetTaskAuditLogsInput } from './mapper/request/task_request_mapper.js'

/**
 * GET /tasks/:id/audit-logs
 * Get task audit logs
 */
export default class GetTaskAuditLogsController {
  async handle(ctx: HttpContext) {
    const getTaskAuditLogsQuery = new GetTaskAuditLogsQuery()
    const auditLogs = await getTaskAuditLogsQuery.execute(
      buildGetTaskAuditLogsInput(ctx.request, ctx.params.id as string)
    )

    ctx.response.json({
      success: true,
      data: auditLogs,
    })
    return
  }
}
