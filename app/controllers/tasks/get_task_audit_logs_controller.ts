import type { HttpContext } from '@adonisjs/core/http'

import { buildGetTaskAuditLogsInput } from './mappers/request/task_request_mapper.js'

import GetTaskAuditLogsQuery from '#actions/tasks/queries/get_task_audit_logs_query'
import { mapTaskAuditLogResponse } from '#controllers/audit/mappers/audit_log_response_mapper'

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

    ctx.response.json(mapTaskAuditLogResponse(auditLogs))
    return
  }
}
