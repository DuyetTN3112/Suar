import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListTaskStatusesQuery from '#modules/organizations/actions/current/workflow/queries/list_task_statuses_query'

/**
 * ListTaskStatusesController
 *
 * Show custom task statuses
 *
 * GET /org/workflow/statuses
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
