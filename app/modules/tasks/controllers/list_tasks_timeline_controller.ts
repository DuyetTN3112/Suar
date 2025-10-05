import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { makeGetTasksTimelineQuery } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * GET /api/tasks/timeline
 * Return tasks for Gantt timeline view
 */
export default class ListTasksTimelineController {
  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const execCtx = actionContextFromHttp(ctx)
    const query = makeGetTasksTimelineQuery(execCtx)
    const tasks = await query.execute(organizationId)

    return wrapApiV1Data(tasks)
  }
}
