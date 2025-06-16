import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ListTaskStatusesQuery from '#actions/organization/workflow/queries/list_task_statuses_query'

/**
 * ListTaskStatusesController
 *
 * Show custom task statuses
 *
 * GET /org/workflow/statuses
 */
export default class ListTaskStatusesController {
  async handle({ inertia, request }: HttpContext) {
    const execCtx = ExecutionContext.fromHttp({ request } as any)

    // Execute query
    const query = new ListTaskStatusesQuery(execCtx)
    const result = await query.handle({})

    return inertia.render('org/workflow/index', result)
  }
}
