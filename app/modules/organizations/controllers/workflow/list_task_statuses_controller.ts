import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationWorkflowQueryFactory } from '#modules/organizations/actions/ports/inbound/organization_workflow_query_factory'

/**
 * ListTaskStatusesController
 *
 * Show custom task statuses
 *
 * GET /org/tasks/workflow
 */
@inject()
export default class ListTaskStatusesController {
  constructor(private readonly actions: OrganizationWorkflowQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const execCtx = actionContextFromHttp(ctx)

    // Execute query
    const query = this.actions.makeListTaskStatuses(execCtx)
    const result = await query.executeAndWrap({}).then((outcome) => outcome.getValue())

    return inertia.render('org/workflow/index', result)
  }
}
