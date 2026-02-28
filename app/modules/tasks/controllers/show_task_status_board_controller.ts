import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeGetTaskStatusBoardPageQuery } from '#modules/tasks/bootstrap/task_action_factory'

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

    const pageData = await makeGetTaskStatusBoardPageQuery(actionContextFromHttp(ctx)).execute(
      organizationId
    )

    return inertia.render('tasks/status_board', pageData)
  }
}
