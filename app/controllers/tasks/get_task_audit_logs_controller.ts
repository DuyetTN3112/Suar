import type { HttpContext } from '@adonisjs/core/http'
import GetTaskAuditLogsQuery from '#actions/tasks/queries/get_task_audit_logs_query'
import { PAGINATION } from '#constants/common_constants'

/**
 * GET /tasks/:id/audit-logs
 * Get task audit logs
 */
export default class GetTaskAuditLogsController {
  async handle(ctx: HttpContext) {
    const taskId = ctx.params.id as string
    const limit = ctx.request.input('limit', PAGINATION.DEFAULT_PER_PAGE) as number

    const getTaskAuditLogsQuery = new GetTaskAuditLogsQuery()
    const auditLogs = await getTaskAuditLogsQuery.execute(taskId, limit)

    ctx.response.json({
      success: true,
      data: auditLogs,
    })
    return
  }
}
