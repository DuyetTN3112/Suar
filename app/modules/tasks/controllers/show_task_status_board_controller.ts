import type { HttpContext } from '@adonisjs/core/http'

import GetTaskStatusBoardPageQuery from '#actions/tasks/queries/get_task_status_board_page_query'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#modules/errors/constants/error_constants'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /tasks/status-board
 * POC page for status board slice scaffold validation.
 */
export default class ShowTaskStatusBoardController {
  async handle(ctx: HttpContext) {
    const { inertia, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const pageData = await new GetTaskStatusBoardPageQuery(ExecutionContext.fromHttp(ctx)).execute(
      organizationId
    )

    return inertia.render('tasks/status_board', pageData)
  }
}
