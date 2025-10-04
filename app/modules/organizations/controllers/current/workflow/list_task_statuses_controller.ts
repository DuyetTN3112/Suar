import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ListTaskStatusesQuery from '#modules/organizations/actions/current/workflow/queries/list_task_statuses_query'

/**
 * ListTaskStatusesController
 *
 * Show custom task statuses
 *
 * GET /org/tasks/workflow
 */
export default class ListTaskStatusesController {
  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const execCtx = actionContextFromHttp(ctx)

    // Execute query
    const query = new ListTaskStatusesQuery(execCtx)
    const result = await query.handle({})

    return inertia.render('org/workflow/index', result)
  }
}
