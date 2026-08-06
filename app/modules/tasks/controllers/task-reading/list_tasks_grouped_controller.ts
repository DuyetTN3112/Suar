import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskBoardQueryFactory } from '#modules/tasks/actions/ports/inbound/task_board_query_factory'

/**
 * GET /api/tasks/grouped
 * Return tasks grouped by status for Kanban board
 */
@inject()
export default class ListTasksGroupedController {
  constructor(private readonly boardQueries: TaskBoardQueryFactory) {}

  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const execCtx = actionContextFromHttp(ctx)
    const query = this.boardQueries.makeGrouped(execCtx)
    const grouped = await query.executeAndWrap({ organizationId }).then((outcome) => outcome.getValue())

    return wrapApiV1Data(grouped)
  }
}
