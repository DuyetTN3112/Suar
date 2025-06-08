import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import GetTasksGroupedQuery from '#actions/tasks/queries/get_tasks_grouped_query'

/**
 * GET /api/tasks/grouped
 * Return tasks grouped by status for Kanban board
 */
export default class ListTasksGroupedController {
  async handle(ctx: HttpContext) {
    const { response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetTasksGroupedQuery(execCtx)
    const grouped = await query.execute(organizationId)

    response.json({ success: true, data: grouped })
  }
}
