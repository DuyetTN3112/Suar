import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildGetTaskAuditLogsInput } from '../mappers/request/task-reading/task_request_mapper.js'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { TaskDetailQueryFactory } from '#modules/tasks/actions/ports/inbound/task_detail_query_factory'

/**
 * GET /tasks/:taskId/audit-logs
 * Get task audit logs
 */
@inject()
export default class GetTaskAuditLogsController {
  constructor(private readonly detailQueries: TaskDetailQueryFactory) {}

  async handle(ctx: HttpContext) {
    const getTaskAuditLogsQuery = this.detailQueries.makeAuditLogs(actionContextFromHttp(ctx))
    const auditLogs = await getTaskAuditLogsQuery.executeAndWrap(
      buildGetTaskAuditLogsInput(ctx.request, ctx.params['taskId'] as string)
    ).then((outcome) => outcome.getValue())

    return wrapApiV1Data(auditLogs)
  }
}
