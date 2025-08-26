import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeGetTasksTimelineQuery } from '#modules/tasks/bootstrap/task_action_factory'

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

    const execCtx = actionContextFromHttp(ctx)
    const query = makeGetTasksTimelineQuery(execCtx)
    const tasks = await query.execute(organizationId)

    response.json({ success: true, data: tasks })
  }
}
