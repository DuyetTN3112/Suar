import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ListWorkflowQuery from '#modules/tasks/actions/queries/list_workflow_query'

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
