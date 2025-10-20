import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { makeGetTasksGroupedQuery } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * GET /api/tasks/grouped
 * Return tasks grouped by status for Kanban board
 */
export default class ListTasksGroupedController {
  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const execCtx = actionContextFromHttp(ctx)
    const query = makeGetTasksGroupedQuery(execCtx)
    const grouped = await query.execute(organizationId)

    return wrapApiV1Data(grouped)
  }
}
