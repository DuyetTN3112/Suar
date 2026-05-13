import type { HttpContext } from '@adonisjs/core/http'

import ListTaskStatusesQuery from '#actions/organizations/current/workflow/queries/list_task_statuses_query'
import { ExecutionContext } from '#types/execution_context'

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
    const execCtx = ExecutionContext.fromHttp(ctx)

    // Execute query
    const query = new ListTaskStatusesQuery(execCtx)
    const result = await query.handle({})

    return inertia.render('org/workflow/index', result)
  }
}
