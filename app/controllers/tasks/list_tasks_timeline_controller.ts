import type { HttpContext } from '@adonisjs/core/http'

import GetTasksTimelineQuery from '#actions/tasks/queries/get_tasks_timeline_query'
import { ErrorMessages } from '#constants/error_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /api/tasks/timeline
 * Return tasks for Gantt timeline view
 */
export default class ListTasksTimelineController {
  async handle(ctx: HttpContext) {
    const { response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetTasksTimelineQuery(execCtx)
    const tasks = await query.execute(organizationId)

    response.json({ success: true, data: tasks })
  }
}
