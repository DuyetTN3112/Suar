import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskBoardQueryFactory } from '#modules/tasks/actions/ports/inbound/task_board_query_factory'

/**
 * GET /api/tasks/timeline
 * Return tasks for Gantt timeline view
 */
@inject()
export default class ListTasksTimelineController {
  constructor(private readonly boardQueries: TaskBoardQueryFactory) {}

  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const execCtx = actionContextFromHttp(ctx)
    const query = this.boardQueries.makeTimeline(execCtx)
    const tasks = await query.executeAndWrap({ organizationId }).then((outcome) => outcome.getValue())

    return wrapApiV1Data(tasks)
  }
}
