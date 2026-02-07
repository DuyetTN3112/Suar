import type { HttpContext } from '@adonisjs/core/http'

import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#modules/errors/constants/error_constants'
import ListTaskStatusesQuery from '#modules/tasks/actions/queries/list_task_statuses_query'

/**
 * GET /api/task-statuses
 * List all active task statuses for current organization.
 */
export default class ListTaskStatusesController {
  async handle(ctx: HttpContext) {
    const { response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const query = new ListTaskStatusesQuery()
    const statuses = await query.execute(organizationId)

    response.json({ success: true, data: statuses })
  }
}
