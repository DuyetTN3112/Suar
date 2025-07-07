import type { HttpContext } from '@adonisjs/core/http'

import ListWorkflowQuery from '#actions/tasks/queries/list_workflow_query'
import { ErrorMessages } from '#constants/error_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * GET /api/workflow
 * List all workflow transitions for current organization.
 */
export default class ListWorkflowController {
  async handle(ctx: HttpContext) {
    const { response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const query = new ListWorkflowQuery()
    const transitions = await query.execute(organizationId)

    response.json({ success: true, data: transitions })
  }
}
